import prisma from "../config/prisma.js";

export async function verifyProjectAccess(userId, projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { teamId: true },
  });
  if (!project) return null;
  return prisma.member.findUnique({
    where: { userId_teamId: { userId, teamId: project.teamId } },
  });
}

export async function verifyTaskAccess(userId, taskId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { project: { select: { teamId: true } } },
  });
  if (!task) return null;
  return prisma.member.findUnique({
    where: { userId_teamId: { userId, teamId: task.project.teamId } },
  });
}

export async function verifyCommentAccess(userId, commentId) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { task: { select: { project: { select: { teamId: true } } } } },
  });
  if (!comment) return null;
  return prisma.member.findUnique({
    where: { userId_teamId: { userId, teamId: comment.task.project.teamId } },
  });
}

export function requireProjectAccess(...roles) {
  return async (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ success: false, data: null, error: "Authentication required" });
    }
    const projectId = req.params.projectId || req.params.id;
    if (!projectId) {
      return res.status(400).json({ success: false, data: null, error: "Project ID required" });
    }
    try {
      const member = await verifyProjectAccess(req.userId, projectId);
      if (!member) {
        return res.status(403).json({ success: false, data: null, error: "You are not a member of this project's team" });
      }
      if (roles.length > 0 && !roles.includes(member.role)) {
        return res.status(403).json({ success: false, data: null, error: `Requires one of roles: ${roles.join(", ")}` });
      }
      req.userRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireTaskAccess(...roles) {
  return async (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ success: false, data: null, error: "Authentication required" });
    }
    const taskId = req.params.id;
    if (!taskId) {
      return res.status(400).json({ success: false, data: null, error: "Task ID required" });
    }
    try {
      const member = await verifyTaskAccess(req.userId, taskId);
      if (!member) {
        return res.status(403).json({ success: false, data: null, error: "You are not a member of this task's team" });
      }
      if (roles.length > 0 && !roles.includes(member.role)) {
        return res.status(403).json({ success: false, data: null, error: `Requires one of roles: ${roles.join(", ")}` });
      }
      req.userRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireTaskAccessByTaskId(...roles) {
  return async (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ success: false, data: null, error: "Authentication required" });
    }
    const taskId = req.params.taskId;
    if (!taskId) {
      return res.status(400).json({ success: false, data: null, error: "Task ID required" });
    }
    try {
      const member = await verifyTaskAccess(req.userId, taskId);
      if (!member) {
        return res.status(403).json({ success: false, data: null, error: "You are not a member of this task's team" });
      }
      if (roles.length > 0 && !roles.includes(member.role)) {
        return res.status(403).json({ success: false, data: null, error: `Requires one of roles: ${roles.join(", ")}` });
      }
      req.userRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireCommentAccess(...roles) {
  return async (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ success: false, data: null, error: "Authentication required" });
    }
    const commentId = req.params.commentId;
    if (!commentId) {
      return res.status(400).json({ success: false, data: null, error: "Comment ID required" });
    }
    try {
      const member = await verifyCommentAccess(req.userId, commentId);
      if (!member) {
        return res.status(403).json({ success: false, data: null, error: "You are not a member of this comment's team" });
      }
      if (roles.length > 0 && !roles.includes(member.role)) {
        return res.status(403).json({ success: false, data: null, error: `Requires one of roles: ${roles.join(", ")}` });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
