import { Router } from "express";
import { getHeroSettings } from "../controllers/heroSettingsController.js";

const router = Router();

router.get("/", getHeroSettings);

export default router;