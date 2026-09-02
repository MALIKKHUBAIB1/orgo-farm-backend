import { Router } from "express";
import { getShopSettings } from "../controllers/shopSettingsController.js";

const router = Router();

router.get("/", getShopSettings);

export default router;