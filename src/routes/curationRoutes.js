import { Router } from "express";
import * as ctrl from "../controllers/curationController.js";
import { requireAdminUser } from "../middleware/adminAuth.js";

const router = Router();

router.get("/", ctrl.listCurations);

router.post("/", requireAdminUser, ctrl.createCuration);
router.patch("/:slug", requireAdminUser, ctrl.updateCuration);
router.delete("/:slug", requireAdminUser, ctrl.deleteCuration);

export default router;