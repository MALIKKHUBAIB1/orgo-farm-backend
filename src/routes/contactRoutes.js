import { Router } from "express";
import { createMessage, listMessages } from "../controllers/contactController.js";
import { createRateLimiter, requireAdmin } from "../middleware/security.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

router.post("/", createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: "Too many messages. Try again later." }), ah(createMessage));
router.get("/", requireAdmin, ah(listMessages));

export default router;
