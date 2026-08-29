import { Router } from "express";
import { getProfile, saveProfile } from "../controllers/profileController.js";

const router = Router();

router.get("/:key", getProfile);
router.put("/:key", saveProfile);

export default router;
