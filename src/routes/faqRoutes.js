import { Router } from "express";
import { listFaqs } from "../controllers/faqController.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", ah(listFaqs));

export default router;