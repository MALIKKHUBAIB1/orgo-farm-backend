import { Router } from "express";
import { getShopSettings } from "../controllers/shopSettingsController.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", ah(getShopSettings));

export default router;