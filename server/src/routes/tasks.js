import { Router } from "express";
import {
  getTask, updateTask, updateTaskStatus,
  deleteTask, listMyTasks,
} from "../controllers/tasks.js";
import { requireTaskAccess } from "../middleware/access.js";
import { validate, required } from "../middleware/validate.js";

const router = Router();

router.get("/", listMyTasks);
router.get("/:id", requireTaskAccess(), getTask);
router.put("/:id", requireTaskAccess("MANAGER", "SUPERVISOR", "MEMBER"), updateTask);
router.patch("/:id/status", requireTaskAccess("MANAGER", "SUPERVISOR", "MEMBER"), validate({ status: [required] }), updateTaskStatus);
router.delete("/:id", requireTaskAccess("MANAGER", "SUPERVISOR"), deleteTask);

export default router;
