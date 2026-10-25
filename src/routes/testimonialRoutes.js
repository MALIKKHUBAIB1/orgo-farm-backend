import { Router } from "express";
import { getTestimonials } from "../controllers/testimonialController.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", ah(getTestimonials));

export default router;