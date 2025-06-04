// server.js
// ──────────────────────────────────────────────────────────────────────────
// Simple Express server that wires your OOP classes into REST endpoints.
// Assumes `models/` contains Voter.js, Candidate.js, Ballot.js, Election.js, VotingSystem.js
// Usage: `node server.js` and visit http://localhost:3000
// ──────────────────────────────────────────────────────────────────────────

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

// Import your classes (adjust paths if needed)
const Voter = require("./models/Voter");
const Candidate = require("./models/Candidate");
const Ballot = require("./models/Ballot");
const Election = require("./models/Election");
const VotingSystem = require("./models/VotingSystem");

const app = express();
const PORT = 3000;

// parse JSON bodies
app.use(bodyParser.json());
// serve static files from public/
app.use(express.static(path.join(__dirname, "public")));

// Create a single VotingSystem instance (adminPassword = "admin123")
const vs = new VotingSystem("admin123");

// ─────────────────────────────────────────────────────────
// 1) Bootstrap: Create one sample election + two candidates
// ─────────────────────────────────────────────────────────

const sampleElectionId = "e2025";
const startDate = new Date(Date.now() - 60_000); // opened 1 minute ago
const endDate   = new Date(Date.now() + 24 * 60 * 60_000); // closes in 24h

// 1.1 Create election (adminPassword must match)
try {
  vs.createElection(sampleElectionId, "2025 Mayoral Race", startDate, endDate, "admin123");
} catch (e) {
  console.error("Error creating sample election:", e.message);
}

// 1.2 Register two sample candidates at system level
const candA = vs.registerSystemCandidate("Alice Rivera", "Party A");
const candB = vs.registerSystemCandidate("Bob Santos", "Party B");

// 1.3 Add those candidates to our sample election
try {
  vs.addCandidateToElection(sampleElectionId, candA.candidateId, "admin123");
  vs.addCandidateToElection(sampleElectionId, candB.candidateId, "admin123");
} catch (e) {
  console.error("Error adding sample candidates:", e.message);
}

// ─────────────────────────────────────────────────────────
// 2) API Endpoints
// ─────────────────────────────────────────────────────────

// 2.1 Register a new system voter
//    POST /api/voter/register    { name, nationalId, dateOfBirth }
app.post("/api/voter/register", (req, res) => {
  const { name, nationalId, dateOfBirth } = req.body;
  if (!name || !nationalId || !dateOfBirth) {
    return res.status(400).json({ error: "Missing fields." });
  }
  try {
    const voter = vs.registerSystemVoter(name, nationalId, new Date(dateOfBirth));
    return res.json({ voterId: voter.voterId });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 2.2 List ongoing elections
//    GET /api/elections/ongoing
app.get("/api/elections/ongoing", (req, res) => {
  try {
    const list = vs.listOngoingElections(); // array of summaries
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 2.3 List candidates for a given election
//    GET /api/election/:eid/candidates
app.get("/api/election/:eid/candidates", (req, res) => {
  const eid = req.params.eid;
  const election = vs.elections.get(eid);
  if (!election) return res.status(404).json({ error: "Election not found." });

  // Return array of { candidateId, name, party }
  const arr = Array.from(election.candidates.values()).map((c) => ({
    candidateId: c.candidateId,
    name: c.name,
    party: c.party,
  }));
  return res.json(arr);
});

// 2.4 Register a voter for a given election
//    POST /api/election/:eid/register
//    { voterId }
app.post("/api/election/:eid/register", (req, res) => {
  const eid = req.params.eid;
  const { voterId } = req.body;
  if (!voterId) return res.status(400).json({ error: "Missing voterId." });

  if (!vs.voters.has(voterId)) {
    return res.status(404).json({ error: "Voter not found in system." });
  }
  if (!vs.elections.has(eid)) {
    return res.status(404).json({ error: "Election not found." });
  }

  try {
    vs.registerVoterForElection(voterId, eid);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 2.5 Cast a ballot
//    POST /api/election/:eid/vote
//    { voterId, candidateId }
app.post("/api/election/:eid/vote", (req, res) => {
  const eid = req.params.eid;
  const { voterId, candidateId } = req.body;
  if (!voterId || !candidateId) {
    return res.status(400).json({ error: "Missing voterId or candidateId." });
  }
  try {
    vs.castSystemBallot(voterId, eid, candidateId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// 2.6 Get election results (only if closed)
//    GET /api/election/:eid/results
app.get("/api/election/:eid/results", (req, res) => {
  const eid = req.params.eid;
  if (!vs.elections.has(eid)) {
    return res.status(404).json({ error: "Election not found." });
  }
  const election = vs.elections.get(eid);
  if (!election.closed) {
    return res.status(400).json({ error: "Election not yet closed." });
  }
  try {
    const results = vs.getElectionResults(eid);
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 2.7 Close an election (admin)
//    POST /api/election/:eid/close  { password }
app.post("/api/election/:eid/close", (req, res) => {
  const eid = req.params.eid;
  const { password } = req.body;
  if (password !== vs.adminPassword) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  try {
    vs.closeElection(eid, password);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// 3) Catch‐all for unhandled routes
// ─────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send("Not Found");
});

// ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
