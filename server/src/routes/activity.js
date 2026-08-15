import { Router } from "express";
import { listActivity } from "../controllers/activity.js";

const router = Router();

router.get("/", listActivity);

export default router;
