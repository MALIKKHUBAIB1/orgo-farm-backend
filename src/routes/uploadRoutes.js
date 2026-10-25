import { Router } from "express";
import { uploadImage, uploadToken } from "../controllers/uploadController.js";
import { requireAdminUser } from "../middleware/adminAuth.js";
import { createRateLimiter } from "../middleware/security.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: "Too many uploads. Try again later.",
});

router.get("/token", requireAdminUser, ah(uploadToken));
router.post("/", requireAdminUser, uploadLimiter, ah(uploadImage));

export default router;