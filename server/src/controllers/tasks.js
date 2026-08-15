import * as taskService from "../services/tasks.js";
import * as activityService from "../services/activity.js";
import prisma from "../config/prisma.js";
import { sendNotificationEmail } from "../services/email.js";
import { pick } from "../utils/pick.js";

export async function listTasks(req, res, next) {
  try {
    const tasks = await taskService.listTasks(req.params.projectId);
    return res.json({ success: true, data: tasks, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getTask(req, res, next) {
  try {
    const task = await taskService.getTask(req.params.id);
    if (!task) return res.status(404).json({ success: false, data: null, error: "Task not found" });
    return res.json({ success: true, data: task, error: null });
  } catch (err) {
    next(err);
  }
}

async function enforceTaskDueDateRange(dueDate, projectId) {
  if (!dueDate) return;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { startDate: true, dueDate: true, name: true },
  });
  if (!project) return;
  const d = new Date(dueDate);
  const fmt = (date) => date.toISOString().split("T")[0];
  if (project.startDate && d < new Date(project.startDate)) {
    const err = new Error(`Task due date (${fmt(d)}) must be on or after the project start date (${fmt(project.startDate)})`);
    err.status = 400;
    throw err;
  }
  if (project.dueDate && d > new Date(project.dueDate)) {
    const err = new Error(`Task due date (${fmt(d)}) must be on or before the project end date (${fmt(project.dueDate)})`);
    err.status = 400;
    throw err;
  }
}

async function notifyTaskAssigned(task, actorId, teamId) {
  if (!task.assigneeId || task.assigneeId === actorId) return;
  try {
    const [assignee, actor] = await Promise.all([
      prisma.user.findUnique({ where: { id: task.assigneeId }, select: { email: true, name: true } }),
      prisma.user.findUnique({ where: { id: actorId }, select: { name: true } }),
    ]);
    const notification = await prisma.notification.create({
      data: {
        type: "TASK_ASSIGNED",
        title: `You have been assigned: "${task.title}"`,
        message: `${actor?.name || "Someone"} assigned you to "${task.title}"`,
        entityType: "task",
        entityId: task.id,
        link: task.projectId,
        data: { taskTitle: task.title },
        teamId: teamId || null,
        userId: task.assigneeId,
        actorId,
      },
    });
    if (assignee?.email) {
      const prefs = await prisma.notificationPreference.findUnique({ where: { userId: task.assigneeId } });
      if (!prefs || prefs.emailNotifications) {
        await sendNotificationEmail({
          recipientEmail: assignee.email,
          recipientName: assignee.name,
          subject: "[TeamHub] A task has been assigned to you",
          notificationTitle: `"${task.title}" has been assigned to you`,
          ctaLink: task.projectId,
        });
      }
    }
  } catch (err) {
    console.error("Failed to notify task assignee:", err.message);
  }
}

async function notifyTaskUnassigned(previousAssigneeId, actorId, taskId, taskTitle, teamId) {
  if (!previousAssigneeId || previousAssigneeId === actorId) return;
  try {
    const [unassignedUser, actor] = await Promise.all([
      prisma.user.findUnique({ where: { id: previousAssigneeId }, select: { email: true, name: true } }),
      prisma.user.findUnique({ where: { id: actorId }, select: { name: true } }),
    ]);
    await prisma.notification.create({
      data: {
        type: "TASK_UNASSIGNED",
        title: `You have been unassigned from "${taskTitle}"`,
        message: `${actor?.name || "Someone"} removed you from "${taskTitle}"`,
        entityType: "task",
        entityId: taskId,
        data: { taskTitle },
        teamId: teamId || null,
        userId: previousAssigneeId,
        actorId,
      },
    });
    if (unassignedUser?.email) {
      const prefs = await prisma.notificationPreference.findUnique({ where: { userId: previousAssigneeId } });
      if (!prefs || prefs.emailNotifications) {
        await sendNotificationEmail({
          recipientEmail: unassignedUser.email,
          recipientName: unassignedUser.name,
          subject: "[TeamHub] You have been unassigned from a task",
          notificationTitle: `You have been unassigned from "${taskTitle}"`,
        });
      }
    }
  } catch (err) {
    console.error("Failed to notify unassigned user:", err.message);
  }
}

async function getTeamIdForTask(taskId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { project: { select: { teamId: true } } },
  });
  return task?.project?.teamId || null;
}

async function notifyStatusChanged(task, actorId, oldStatus, newStatus, teamId) {
  if (!task || oldStatus === newStatus) return;
  const recipients = new Set();
  if (task.assigneeId) recipients.add(task.assigneeId);
  if (task.creatorId) recipients.add(task.creatorId);
  recipients.delete(actorId);
  if (recipients.size === 0) return;

  try {
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
    const actorName = actor?.name || "Someone";
    const title = `${actorName} changed "${task.title}" to ${newStatus}`;

    for (const userId of recipients) {
      await prisma.notification.create({
        data: {
          type: "STATUS_CHANGED",
          title,
          message: title,
          entityType: "task",
          entityId: task.id,
          link: task.projectId,
          data: { taskTitle: task.title, from: oldStatus, to: newStatus },
          teamId: teamId || null,
          userId,
          actorId,
        },
      });
    }

    for (const userId of recipients) {
      const user = userId === task.assigneeId ? task.assignee : task.creator;
      if (user?.email) {
        const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
        if (!prefs || prefs.statusChangeNotifications) {
          await sendNotificationEmail({
            recipientEmail: user.email,
            recipientName: user.name,
            subject: `[TeamHub] "${task.title}" changed to ${newStatus} by ${actorName}`,
            notificationTitle: title,
            ctaLink: task.projectId,
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to notify status change:", err.message);
  }
}

export async function createTask(req, res, next) {
  try {
    await enforceTaskDueDateRange(req.body.dueDate, req.params.projectId);
    const taskData = pick(req.body, ["title", "description", "status", "priority", "category", "dueDate", "assigneeId"]);
    if (req.userRole === "MEMBER") {
      taskData.assigneeId = req.userId;
    }
    const task = await taskService.createTask(req.params.projectId, {
      ...taskData,
      creatorId: req.userId,
    });
    const teamId = await getTeamIdForTask(task.id);
    await activityService.logActivity(req.userId, "CREATED_TASK", "task", task.id, `Created task "${task.title}"`, teamId, { task: task.title });
    await notifyTaskAssigned(task, req.userId, teamId);
    return res.status(201).json({ success: true, data: task, error: null });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req, res, next) {
  try {
    const previousTask = await taskService.getTask(req.params.id);
    if (!previousTask) return res.status(404).json({ success: false, data: null, error: "Task not found" });

    const teamId = previousTask.project?.teamId || null;

    if (req.body.dueDate) {
      await enforceTaskDueDateRange(req.body.dueDate, previousTask.projectId);
    }

    const taskData = pick(req.body, ["title", "description", "status", "priority", "category", "dueDate", "assigneeId", "commentsDisabled"]);

    if (req.userRole === "MEMBER") {
      const isOwner = previousTask.assigneeId === req.userId;
      if (!isOwner) {
        return res.status(403).json({ success: false, data: null, error: "You can only edit tasks assigned to you" });
      }
      if (taskData.assigneeId !== undefined && taskData.assigneeId !== null && taskData.assigneeId !== req.userId) {
        return res.status(403).json({ success: false, data: null, error: "Members cannot reassign tasks to other members" });
      }
      delete taskData.commentsDisabled;
    }

    if (req.userRole !== "MANAGER") {
      delete taskData.commentsDisabled;
    }

    const statusChanged = taskData.status && taskData.status !== previousTask.status;
    if (statusChanged) {
      taskData.lastReminderSentAt = null;
    }

    const task = await taskService.updateTask(req.params.id, taskData);

    if (taskData.assigneeId !== undefined) {
      if (taskData.assigneeId && taskData.assigneeId !== previousTask.assigneeId) {
        const newAssignee = await prisma.user.findUnique({ where: { id: taskData.assigneeId }, select: { name: true } });
        const prevName = previousTask.assignee?.name || null;
        const details = prevName
          ? `Reassigned task "${task.title}" from ${prevName} to ${newAssignee?.name || "someone"}`
          : `Assigned task "${task.title}" to ${newAssignee?.name || "someone"}`;
        await activityService.logActivity(req.userId, "REASSIGNED_TASK", "task", task.id, details, teamId, { task: task.title });
      } else if (taskData.assigneeId === null && previousTask.assigneeId) {
        await notifyTaskUnassigned(previousTask.assigneeId, req.userId, task.id, task.title, teamId);
        await activityService.logActivity(req.userId, "REASSIGNED_TASK", "task", task.id, `Unassigned task "${task.title}" from ${previousTask.assignee?.name || "someone"}`, teamId, { task: task.title });
      } else {
        await activityService.logActivity(req.userId, "UPDATED_TASK", "task", task.id, `Updated task "${task.title}"`, teamId, { task: task.title });
      }
      if (taskData.assigneeId) {
        await notifyTaskAssigned(task, req.userId, teamId);
      }
    } else {
      await activityService.logActivity(req.userId, "UPDATED_TASK", "task", task.id, `Updated task "${task.title}"`, teamId, { task: task.title });
    }

    if (statusChanged) {
      await notifyStatusChanged(task, req.userId, previousTask.status, task.status, teamId);
    }

    return res.json({ success: true, data: task, error: null });
  } catch (err) {
    next(err);
  }
}

export async function updateTaskStatus(req, res, next) {
  try {
    const { status } = req.body;
    const existing = await taskService.getTask(req.params.id);
    if (!existing) return res.status(404).json({ success: false, data: null, error: "Task not found" });

    if (req.userRole === "MEMBER") {
      const isOwner = existing.assigneeId === req.userId;
      if (!isOwner) {
        return res.status(403).json({ success: false, data: null, error: "You can only change the status of tasks assigned to you" });
      }
    }

    const task = await taskService.updateTaskStatus(req.params.id, status);
    const teamId = await getTeamIdForTask(task.id);
    await activityService.logActivity(req.userId, "UPDATED_TASK_STATUS", "task", task.id, `Changed status to ${status}`, teamId, { status });
    await notifyStatusChanged(task, req.userId, existing.status, status, teamId);

    return res.json({ success: true, data: task, error: null });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req, res, next) {
  try {
    const teamId = await getTeamIdForTask(req.params.id);
    const task = await taskService.deleteTask(req.params.id);
    await activityService.logActivity(req.userId, "DELETED_TASK", "task", req.params.id, "Deleted task", teamId);
    return res.json({ success: true, data: task, error: null });
  } catch (err) {
    next(err);
  }
}

export async function listMyTasks(req, res, next) {
  try {
    const { teamId } = req.query;
    if (teamId) {
      const member = await prisma.member.findUnique({
        where: { userId_teamId: { userId: req.userId, teamId } },
      });
      if (!member) {
        return res.status(403).json({ success: false, data: null, error: "You are not a member of this team" });
      }
    }
    if (req.query.scope === "all") {
      if (!teamId) {
        return res.status(400).json({ success: false, data: null, error: "teamId is required when scope=all" });
      }
      const tasks = await taskService.listTeamTasks(teamId);
      return res.json({ success: true, data: tasks, error: null });
    }
    const tasks = await taskService.listMyTasks(req.userId, teamId);
    return res.json({ success: true, data: tasks, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getKanbanTasks(req, res, next) {
  try {
    const data = await taskService.getKanbanTasks(req.params.projectId);
    return res.json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getCalendarTasks(req, res, next) {
  try {
    const data = await taskService.getCalendarTasks(req.params.projectId);
    return res.json({ success: true, data, error: null });
  } catch (err) {
    next(err);
  }
}
