import * as dashboardService from "../services/dashboard.js";

export async function getTeamOverview(req, res, next) {
  try {
    const data = await dashboardService.getTeamOverview(req.userId, req.query.teamId);
    return res.json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getUserOverview(req, res, next) {
  try {
    const data = await dashboardService.getUserOverview(req.userId, req.query.teamId);
    return res.json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getTasksByStatus(req, res, next) {
  try {
    const data = await dashboardService.getTasksByStatus(req.userId, req.query.teamId);
    return res.json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getTasksByPriority(req, res, next) {
  try {
    const data = await dashboardService.getTasksByPriority(req.userId, req.query.teamId);
    return res.json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getMemberWorkload(req, res, next) {
  try {
    const data = await dashboardService.getMemberWorkload(req.userId, req.query.teamId);
    return res.json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardProjects(req, res, next) {
  try {
    const data = await dashboardService.getDashboardProjects(req.userId, req.query.teamId);
    return res.json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardMyTasks(req, res, next) {
  try {
    const data = await dashboardService.getDashboardMyTasks(req.userId, req.query.teamId);
    return res.json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardOverdueTasks(req, res, next) {
  try {
    const data = await dashboardService.getDashboardOverdueTasks(req.userId, req.query.teamId);
    return res.json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardInProgressTasks(req, res, next) {
  try {
    const data = await dashboardService.getDashboardInProgressTasks(req.userId, req.query.teamId);
    return res.json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardRecentActivity(req, res, next) {
  try {
    const { teamId } = req.query;
    const data = await dashboardService.getDashboardRecentActivity(req.userId, teamId);
    return res.json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}
