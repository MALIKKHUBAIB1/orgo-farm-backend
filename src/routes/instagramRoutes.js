import { Router } from "express";
import { listInstaPosts } from "../controllers/instagramController.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/posts", ah(listInstaPosts));

export default router;