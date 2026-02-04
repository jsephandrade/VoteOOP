// server.js
// Simple Express server with a persistent datastore (Prisma + SQLite).

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

require("dotenv").config({ override: true });
const prisma = require("./db/prisma");
const { issueAdminToken, requireAdmin } = require("./lib/auth");
const { schemas, validate } = require("./lib/validation");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// parse JSON bodies
app.use(bodyParser.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// allow local dev frontends (e.g. Live Server on :5500) to call the API
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// serve static files from public/ (and fall back to project root for index.html/script.js)
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function getAge(dateOfBirth) {
  const today = new Date();
  const ageDifMs = today - dateOfBirth;
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function isElectionOpen(election, now = new Date()) {
  if (!election || election.closed) return false;
  return now >= election.startDate && now <= election.endDate;
}

async function ensureSampleData() {
  const electionId = "e2025";
  const startDate = new Date(Date.now() - 60_000);
  const endDate = new Date(Date.now() + 24 * 60 * 60_000);

  await prisma.election.upsert({
    where: { id: electionId },
    update: {},
    create: {
      id: electionId,
      name: "2025 Mayoral Race",
      startDate,
      endDate,
      closed: false,
    },
  });

  const candA = await prisma.candidate.upsert({
    where: {
      candidate_name_party: { name: "Alice Rivera", party: "Party A" },
    },
    update: {},
    create: { name: "Alice Rivera", party: "Party A" },
  });

  const candB = await prisma.candidate.upsert({
    where: {
      candidate_name_party: { name: "Bob Santos", party: "Party B" },
    },
    update: {},
    create: { name: "Bob Santos", party: "Party B" },
  });

  await prisma.electionCandidate.upsert({
    where: {
      electionId_candidateId: {
        electionId,
        candidateId: candA.id,
      },
    },
    update: {},
    create: {
      electionId,
      candidateId: candA.id,
    },
  });

  await prisma.electionCandidate.upsert({
    where: {
      electionId_candidateId: {
        electionId,
        candidateId: candB.id,
      },
    },
    update: {},
    create: {
      electionId,
      candidateId: candB.id,
    },
  });
}

const api = express.Router();
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

api.use(apiLimiter);

// Admin login
// POST /api/admin/login { password }
api.post(
  "/admin/login",
  authLimiter,
  validate(schemas.adminLogin),
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: "Unauthorized." });
    }
    const token = issueAdminToken();
    return res.json({ token });
  })
);

// Register a new system voter
// POST /api/voter/register { name, nationalId, dateOfBirth }
api.post(
  "/voter/register",
  writeLimiter,
  validate(schemas.voterRegister),
  asyncHandler(async (req, res) => {
    const { name, nationalId, dateOfBirth } = req.body;
    const age = getAge(dateOfBirth);
    if (age < 18) {
      return res
        .status(400)
        .json({ error: "Voter must be at least 18 years old to register." });
    }

    try {
      const voter = await prisma.voter.create({
        data: { name, nationalId, dateOfBirth },
      });
      return res.json({ voterId: voter.id });
    } catch (err) {
      if (err && err.code === "P2002") {
        return res.status(400).json({ error: "National ID already registered." });
      }
      throw err;
    }
  })
);

// List ongoing elections
// GET /api/elections/ongoing
api.get(
  "/elections/ongoing",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const list = await prisma.election.findMany({
      where: {
        closed: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { endDate: "asc" },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    });

    const response = list.map((election) => ({
      electionId: election.id,
      name: election.name,
      startDate: election.startDate,
      endDate: election.endDate,
    }));

    return res.json(response);
  })
);

// List candidates for a given election
// GET /api/election/:eid/candidates
api.get(
  "/election/:eid/candidates",
  validate(schemas.electionParams, "params"),
  asyncHandler(async (req, res) => {
    const { eid } = req.params;
    const election = await prisma.election.findUnique({
      where: { id: eid },
      select: { id: true, name: true },
    });
    if (!election) return res.status(404).json({ error: "Election not found." });

    const candidates = await prisma.candidate.findMany({
      where: { elections: { some: { electionId: eid } } },
      select: { id: true, name: true, party: true },
      orderBy: { name: "asc" },
    });

    const response = candidates.map((candidate) => ({
      candidateId: candidate.id,
      name: candidate.name,
      party: candidate.party,
      electionName: election.name,
    }));

    return res.json(response);
  })
);

// Register a voter for a given election
// POST /api/election/:eid/register { voterId }
api.post(
  "/election/:eid/register",
  writeLimiter,
  validate(schemas.electionParams, "params"),
  validate(schemas.electionRegister),
  asyncHandler(async (req, res) => {
    const { eid } = req.params;
    const { voterId } = req.body;

    const voter = await prisma.voter.findUnique({
      where: { id: voterId },
      select: { id: true },
    });
    if (!voter) {
      return res.status(404).json({ error: "Voter not found in system." });
    }

    const election = await prisma.election.findUnique({
      where: { id: eid },
      select: { id: true, closed: true },
    });
    if (!election) {
      return res.status(404).json({ error: "Election not found." });
    }
    if (election.closed) {
      return res
        .status(400)
        .json({ error: "Cannot register voter. Election is already closed." });
    }

    try {
      await prisma.electionRegistration.create({
        data: { electionId: eid, voterId },
      });
      return res.json({ success: true });
    } catch (err) {
      if (err && err.code === "P2002") {
        return res.json({ success: true, alreadyRegistered: true });
      }
      throw err;
    }
  })
);

// Cast a ballot
// POST /api/election/:eid/vote { voterId, candidateId }
api.post(
  "/election/:eid/vote",
  writeLimiter,
  validate(schemas.electionParams, "params"),
  validate(schemas.ballot),
  asyncHandler(async (req, res) => {
    const { eid } = req.params;
    const { voterId, candidateId } = req.body;

    const voter = await prisma.voter.findUnique({
      where: { id: voterId },
      select: { id: true },
    });
    if (!voter) {
      return res.status(404).json({ error: "Voter not found in system." });
    }

    const election = await prisma.election.findUnique({
      where: { id: eid },
      select: { id: true, startDate: true, endDate: true, closed: true },
    });
    if (!election) {
      return res.status(404).json({ error: "Election not found." });
    }
    if (!isElectionOpen(election)) {
      return res
        .status(400)
        .json({ error: "Election is not open for voting at this time." });
    }

    const registration = await prisma.electionRegistration.findUnique({
      where: {
        electionId_voterId: { electionId: eid, voterId },
      },
      select: { electionId: true },
    });
    if (!registration) {
      return res
        .status(400)
        .json({ error: "Voter is not registered for this election." });
    }

    const candidateInElection = await prisma.electionCandidate.findUnique({
      where: {
        electionId_candidateId: { electionId: eid, candidateId },
      },
      select: { candidateId: true },
    });
    if (!candidateInElection) {
      return res
        .status(400)
        .json({ error: "Candidate is not in this election." });
    }

    try {
      await prisma.ballot.create({
        data: { electionId: eid, voterId, candidateId },
      });
      return res.json({ success: true });
    } catch (err) {
      if (err && err.code === "P2002") {
        return res
          .status(400)
          .json({ error: "Voter has already cast a ballot in this election." });
      }
      throw err;
    }
  })
);

// Get election results (only if closed)
// GET /api/election/:eid/results
api.get(
  "/election/:eid/results",
  validate(schemas.electionParams, "params"),
  asyncHandler(async (req, res) => {
    const { eid } = req.params;
    const election = await prisma.election.findUnique({
      where: { id: eid },
      select: { id: true, closed: true },
    });
    if (!election) {
      return res.status(404).json({ error: "Election not found." });
    }
    if (!election.closed) {
      return res.status(400).json({ error: "Election not yet closed." });
    }

    const candidates = await prisma.candidate.findMany({
      where: { elections: { some: { electionId: eid } } },
      select: { id: true, name: true, party: true },
    });

    const counts = await prisma.ballot.groupBy({
      by: ["candidateId"],
      where: { electionId: eid },
      _count: { candidateId: true },
    });

    const countMap = new Map(
      counts.map((c) => [c.candidateId, c._count.candidateId])
    );

    const results = candidates
      .map((candidate) => ({
        candidateId: candidate.id,
        name: candidate.name,
        party: candidate.party,
        votes: countMap.get(candidate.id) || 0,
      }))
      .sort((a, b) => b.votes - a.votes);

    return res.json(results);
  })
);

// Close an election (admin)
// POST /api/election/:eid/close (Authorization: Bearer <token>)
api.post(
  "/election/:eid/close",
  writeLimiter,
  validate(schemas.electionParams, "params"),
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { eid } = req.params;

    const election = await prisma.election.findUnique({
      where: { id: eid },
      select: { id: true, closed: true },
    });
    if (!election) {
      return res.status(404).json({ error: "Election not found." });
    }
    if (election.closed) {
      return res.status(400).json({ error: "Election already closed." });
    }

    await prisma.election.update({
      where: { id: eid },
      data: { closed: true },
    });

    return res.json({ success: true });
  })
);

app.use("/api", api);
app.use("/api/v1", api);

// Catch-all for unhandled routes
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

async function start() {
  await ensureSampleData();
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  prisma
    .$disconnect()
    .catch(() => undefined)
    .finally(() => process.exit(1));
});

process.on("SIGINT", () => {
  prisma
    .$disconnect()
    .catch(() => undefined)
    .finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  prisma
    .$disconnect()
    .catch(() => undefined)
    .finally(() => process.exit(0));
});
