import { Router } from "express";
import * as ctrl from "../controllers/productController.js";
import { requireAdminUser } from "../middleware/adminAuth.js";

const router = Router();

router.get("/", ctrl.listProducts);
router.get("/facets", ctrl.listFacets);
router.get("/:slug", ctrl.getProduct);

router.post("/", requireAdminUser, ctrl.createProduct);
router.patch("/:slug", requireAdminUser, ctrl.updateProduct);
router.delete("/:slug", requireAdminUser, ctrl.deleteProduct);

export default router;