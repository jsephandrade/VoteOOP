const jwt = require("jsonwebtoken");

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "change-me";
const ADMIN_TOKEN_TTL = process.env.ADMIN_TOKEN_TTL || "8h";

function issueAdminToken() {
  return jwt.sign({ role: "admin" }, ADMIN_JWT_SECRET, {
    expiresIn: ADMIN_TOKEN_TTL,
  });
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid admin token." });
  }

  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET);
    if (!payload || payload.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized." });
    }
    req.admin = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired admin token." });
  }
}

module.exports = {
  issueAdminToken,
  requireAdmin,
};
