import serverless from "serverless-http";
import { createApp } from "../src/app.js";
import { connectDB } from "../src/config/db.js";

const app = createApp();
const base = serverless(app);

let dbPromise = null;
function ensureDb() {
  if (!dbPromise) {
    dbPromise = connectDB().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export default async function handler(req) {
  const path = req.path || "";

  if (!path.startsWith("/api/cron/") && !path.startsWith("/api/health")) {
    try {
      await ensureDb();
    } catch (error) {
      console.error("[vercel] db connect failed:", error.message);
      return {
        statusCode: 503,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: error.message }),
      };
    }
  }
  return base(req);
}

export { handler };