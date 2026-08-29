import { Router } from "express";
import { listInstaPosts } from "../controllers/instagramController.js";

const router = Router();

router.get("/posts", listInstaPosts);

export default router;