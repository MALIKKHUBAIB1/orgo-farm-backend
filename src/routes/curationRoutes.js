import { Router } from "express";
import * as ctrl from "../controllers/curationController.js";
import { requireAdminUser } from "../middleware/adminAuth.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", ah(ctrl.listCurations));

router.post("/", requireAdminUser, ah(ctrl.createCuration));
router.patch("/:slug", requireAdminUser, ah(ctrl.updateCuration));
router.delete("/:slug", requireAdminUser, ah(ctrl.deleteCuration));

export default router;