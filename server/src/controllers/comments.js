import * as commentService from "../services/comments.js";
import * as taskService from "../services/tasks.js";
import { sendNotificationEmail } from "../services/email.js";
import { verifyCommentAccess } from "../middleware/access.js";
import prisma from "../config/prisma.js";

export async function listTaskComments(req, res, next) {
  try {
    const comments = await commentService.listTaskComments(req.params.taskId);
    return res.json({ success: true, data: comments, error: null });
  } catch (err) {
    next(err);
  }
}

export async function addTaskComment(req, res, next) {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId }, select: { commentsDisabled: true } });
    if (!task) return res.status(404).json({ success: false, data: null, error: "Task not found" });
    if (task.commentsDisabled) return res.status(400).json({ success: false, data: null, error: "Comments are disabled for this task" });
    const comment = await commentService.addTaskComment(req.params.taskId, {
      body: req.body.body,
      authorId: req.userId,
    });

    // Email notification to task assignee
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
        select: { assigneeId: true, title: true, projectId: true, project: { select: { teamId: true } } },
      });
      if (task?.assigneeId && task.assigneeId !== req.userId) {
        const actor = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, email: true } });
        const assignee = await prisma.user.findUnique({ where: { id: task.assigneeId }, select: { email: true, name: true } });

        await prisma.notification.create({
          data: {
            type: "COMMENT_ADDED",
            title: `${actor?.name || "Someone"} commented on "${task.title}"`,
            message: `${actor?.name || "Someone"} commented on "${task.title}"`,
            entityType: "task",
            entityId: req.params.taskId,
            link: task.projectId,
            data: { taskTitle: task.title },
            teamId: task.project?.teamId || null,
            userId: task.assigneeId,
            actorId: req.userId,
          },
        });

        if (assignee?.email) {
          const prefs = await prisma.notificationPreference.findUnique({ where: { userId: task.assigneeId } });
          if (!prefs || prefs.commentNotifications) {
            await sendNotificationEmail({
              recipientEmail: assignee.email,
              recipientName: assignee.name,
              subject: `[TeamHub] ${actor?.name || "Someone"} commented on "${task.title}"`,
              notificationTitle: `${actor?.name || "Someone"} commented on "${task.title}"`,
              ctaLink: task.projectId,
            });
          }
        }
      }
    } catch (emailErr) {
      console.error("Failed to email comment notification:", emailErr.message);
    }

    return res.status(201).json({ success: true, data: comment, error: null });
  } catch (err) {
    next(err);
  }
}

export async function togglePinComment(req, res, next) {
  try {
    const comment = await commentService.togglePinComment(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, data: null, error: "Comment not found" });
    return res.json({ success: true, data: comment, error: null });
  } catch (err) {
    next(err);
  }
}

export async function updateComment(req, res, next) {
  try {
    const comment = await commentService.updateComment(req.params.commentId, req.userId, req.body.body);
    if (!comment) return res.status(404).json({ success: false, data: null, error: "Comment not found" });
    return res.json({ success: true, data: comment, error: null });
  } catch (err) {
    if (err.message?.startsWith("You can only")) {
      return res.status(403).json({ success: false, data: null, error: err.message });
    }
    next(err);
  }
}

export async function deleteComment(req, res, next) {
  try {
    const member = await verifyCommentAccess(req.userId, req.params.commentId);
    const comment = await commentService.deleteComment(req.params.commentId, req.userId, member?.role);
    if (!comment) return res.status(404).json({ success: false, data: null, error: "Comment not found" });
    return res.json({ success: true, data: comment, error: null });
  } catch (err) {
    if (err.message?.startsWith("You can only")) {
      return res.status(403).json({ success: false, data: null, error: err.message });
    }
    next(err);
  }
}

export async function getPinnedComments(req, res, next) {
  try {
    const comments = await commentService.getPinnedComments(req.params.taskId);
    return res.json({ success: true, data: comments, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardPinnedComments(req, res, next) {
  try {
    const comments = await commentService.getPinnedCommentsForUser(req.userId, req.query.teamId);
    return res.json({ success: true, data: comments, error: null });
  } catch (err) {
    next(err);
  }
}

export async function toggleTaskComments(req, res, next) {
  try {
    const task = await taskService.toggleCommentsDisabled(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, data: null, error: "Task not found" });
    return res.json({ success: true, data: task, error: null });
  } catch (err) {
    next(err);
  }
}
