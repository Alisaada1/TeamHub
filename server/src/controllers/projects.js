import * as projectService from "../services/projects.js";
import * as activityService from "../services/activity.js";

export async function listProjects(req, res, next) {
  try {
    const teamId = req.query.teamId;
    const projects = await projectService.listProjects(req.userId, teamId);
    return res.json({ success: true, data: projects, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getProject(req, res, next) {
  try {
    const project = await projectService.getProject(req.params.id);
    if (!project) return res.status(404).json({ success: false, data: null, error: "Project not found" });
    return res.json({ success: true, data: project, error: null });
  } catch (err) {
    next(err);
  }
}

export async function createProject(req, res, next) {
  try {
    const { name, description, status, priority, startDate, endDate, dueDate, color } = req.body;
    const rawEnd = endDate || dueDate;
    const project = await projectService.createProject(req.params.teamId, {
      name, description, status, priority, color,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      dueDate: rawEnd ? new Date(rawEnd).toISOString() : undefined,
      creatorId: req.userId,
    });
    await activityService.logActivity(req.userId, "CREATED_PROJECT", "project", project.id, `Created project "${project.name}"`, req.params.teamId, { project: project.name });
    return res.status(201).json({ success: true, data: project, error: null });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req, res, next) {
  try {
    const { name, description, status, priority, startDate, endDate, dueDate, color } = req.body;
    const rawEnd = endDate || dueDate;
    const project = await projectService.updateProject(req.params.id, {
      name, description, status, priority, color,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      dueDate: rawEnd ? new Date(rawEnd).toISOString() : undefined,
    });
    await activityService.logActivity(req.userId, "UPDATED_PROJECT", "project", project.id, `Updated project "${project.name}"`, project.teamId, { project: project.name });
    return res.json({ success: true, data: project, error: null });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req, res, next) {
  try {
    const project = await projectService.deleteProject(req.params.id);
    await activityService.logActivity(req.userId, "DELETED_PROJECT", "project", req.params.id, "Deleted project", project.teamId);
    return res.json({ success: true, data: project, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getProjectStats(req, res, next) {
  try {
    const stats = await projectService.getProjectStats(req.params.id);
    return res.json({ success: true, data: stats, error: null });
  } catch (err) {
    next(err);
  }
}

export async function archiveProject(req, res, next) {
  try {
    const project = await projectService.archiveProject(req.params.id);
    await activityService.logActivity(req.userId, "ARCHIVED_PROJECT", "project", project.id, `Archived project "${project.name}"`, project.teamId, { project: project.name });
    return res.json({ success: true, data: project, error: null });
  } catch (err) {
    next(err);
  }
}
