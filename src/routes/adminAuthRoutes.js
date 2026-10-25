import { Router } from "express";
import * as ctrl from "../controllers/adminAuthController.js";
import { requireAdminUser } from "../middleware/adminAuth.js";
import { createLoginLimiter, createRateLimiter } from "../middleware/security.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

const loginLimiter = createLoginLimiter({
  maxAttempts: 8,
  windowMs: 15 * 60 * 1000,
  message: "Too many attempts. Try again later.",
});
const setupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many requests. Try again later.",
});

router.post("/login", loginLimiter, ah(ctrl.adminLogin));
router.get("/me", requireAdminUser, ah(ctrl.adminMe));
router.get("/setup", setupLimiter, ah(ctrl.adminSetup));

export default router;