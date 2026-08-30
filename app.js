import "dotenv/config";
import { connectDB } from "./src/config/db.js";
import { createApp } from "./src/app.js";

const app = createApp();

connectDB().catch((err) => console.error("[db] connect failed:", err.message));

export default app;