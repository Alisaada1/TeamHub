import { Router } from "express";
import {
  listProjects, getProject, updateProject,
  deleteProject, getProjectStats, archiveProject,
} from "../controllers/projects.js";
import {
  listTasks, createTask, getKanbanTasks, getCalendarTasks,
} from "../controllers/tasks.js";
import { requireProjectAccess } from "../middleware/access.js";
import { validate, required } from "../middleware/validate.js";

const router = Router();

router.get("/", listProjects);
router.get("/:id", requireProjectAccess(), getProject);
router.put("/:id", requireProjectAccess("MANAGER", "SUPERVISOR"), validate({ name: [required] }), updateProject);
router.patch("/:id/archive", requireProjectAccess("MANAGER"), archiveProject);
router.delete("/:id", requireProjectAccess("MANAGER"), deleteProject);
router.get("/:id/stats", requireProjectAccess(), getProjectStats);

// Project-scoped task routes (inlined to avoid Express mount-order issues)
router.get("/:projectId/tasks", requireProjectAccess(), listTasks);
router.post("/:projectId/tasks", requireProjectAccess("MANAGER", "SUPERVISOR", "MEMBER"), validate({ title: [required] }), createTask);
router.get("/:projectId/tasks/kanban", requireProjectAccess(), getKanbanTasks);
router.get("/:projectId/tasks/calendar", requireProjectAccess(), getCalendarTasks);

export default router;
