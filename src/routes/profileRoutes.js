import { Router } from "express";
import { getProfile, saveProfile } from "../controllers/profileController.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/:key", ah(getProfile));
router.put("/:key", ah(saveProfile));

export default router;
