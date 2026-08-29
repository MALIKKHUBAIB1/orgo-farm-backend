import jwt from "jsonwebtoken";

export function requireAdminUser(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Admin login required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "admin") return res.status(403).json({ error: "Not authorized" });
    req.adminId = payload.uid;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please login again." });
  }
}