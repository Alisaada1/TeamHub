import { Router } from "express";
import {
  getTeamOverview, getUserOverview, getTasksByStatus, getTasksByPriority,
  getMemberWorkload, getDashboardProjects, getDashboardMyTasks,
  getDashboardOverdueTasks, getDashboardInProgressTasks, getDashboardRecentActivity,
} from "../controllers/dashboard.js";

const router = Router();

router.get("/overview", getTeamOverview);
router.get("/user-overview", getUserOverview);
router.get("/tasks-by-status", getTasksByStatus);
router.get("/tasks-by-priority", getTasksByPriority);
router.get("/member-workload", getMemberWorkload);
router.get("/projects", getDashboardProjects);
router.get("/my-tasks", getDashboardMyTasks);
router.get("/overdue-tasks", getDashboardOverdueTasks);
router.get("/in-progress-tasks", getDashboardInProgressTasks);
router.get("/recent-activity", getDashboardRecentActivity);

export default router;
