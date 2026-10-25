import { Router } from "express";
import { login, me, mergeSession, register } from "../controllers/authController.js";
import { authRequired } from "../middleware/auth.js";
import { createLoginLimiter, createRateLimiter } from "../middleware/security.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

const loginLimiter = createLoginLimiter({
  maxAttempts: 15,
  windowMs: 15 * 60 * 1000,
  message: "Too many login attempts. Try again later.",
});
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many accounts from this device. Try again later.",
});

router.post("/register", registerLimiter, ah(register));
router.post("/login", loginLimiter, ah(login));
router.get("/me", authRequired, ah(me));
router.post("/merge", authRequired, ah(mergeSession));

export default router;