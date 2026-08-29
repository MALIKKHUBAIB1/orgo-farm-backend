import { Router } from "express";
import { createMessage, listMessages } from "../controllers/contactController.js";
import { createRateLimiter, requireAdmin } from "../middleware/security.js";

const router = Router();

router.post("/", createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: "Too many messages. Try again later." }), createMessage);
router.get("/", requireAdmin, listMessages);

export default router;
