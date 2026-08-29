import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: "Login required" });
  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).uid;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please login again." });
  }
}

export function authOptional(req, res, next) {
  const token = bearerToken(req);
  if (token) {
    try {
      req.userId = jwt.verify(token, process.env.JWT_SECRET).uid;
    } catch {
      /* ignore invalid token */
    }
  }
  next();
}

function bearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}
