import { Router } from "express";
import { heartbeat, getOnlineUsers } from "../controllers/presence.js";

const router = Router();

router.post("/heartbeat", heartbeat);
router.get("/online", getOnlineUsers);

export default router;
