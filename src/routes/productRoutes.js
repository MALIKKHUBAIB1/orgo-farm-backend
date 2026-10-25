import { Router } from "express";
import * as ctrl from "../controllers/productController.js";
import { requireAdminUser } from "../middleware/adminAuth.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", ah(ctrl.listProducts));
router.get("/facets", ah(ctrl.listFacets));
router.get("/:slug", ah(ctrl.getProduct));

router.post("/", requireAdminUser, ah(ctrl.createProduct));
router.patch("/:slug", requireAdminUser, ah(ctrl.updateProduct));
router.delete("/:slug", requireAdminUser, ah(ctrl.deleteProduct));

export default router;