// Express 4 does NOT forward errors thrown inside async route handlers to the
// error middleware — they become unhandled promise rejections, and modern
// Node.js CRASHES the whole process on those. A 2-second MongoDB Atlas blip
// during any request (e.g. GET /api/products) used to kill the entire API.
//
// Wrap every async (req, res, next) handler with `ah(...)` at registration:
// a failure now becomes a normal 500 JSON response via next(err) and the
// server keeps running. Sync middleware (auth, rate limiters) needs no wrap.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Short alias used in route files.
export const ah = asyncHandler;
