import { Router } from "express";
import { getHeroSettings } from "../controllers/heroSettingsController.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", ah(getHeroSettings));

export default router;