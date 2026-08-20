import prisma from "../config/prisma.js";

const taskInclude = {
  assignee: true,
  creator: true,
  _count: { select: { comments: true } },
};

export async function listTasks(projectId) {
  return prisma.task.findMany({
    where: { projectId },
    include: taskInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function listMyTasks(userId, teamId) {
  return prisma.task.findMany({
    where: { assigneeId: userId, ...(teamId ? { project: { teamId } } : {}) },
    include: { ...taskInclude, project: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listTeamTasks(teamId) {
  return prisma.task.findMany({
    where: { project: { teamId } },
    include: { ...taskInclude, project: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTask(id) {
  return prisma.task.findUnique({
    where: { id },
    include: { ...taskInclude, project: true },
  });
}

export async function createTask(projectId, data) {
  return prisma.task.create({
    data: { ...data, projectId },
    include: taskInclude,
  });
}

export async function updateTask(id, data) {
  const payload = { ...data };
  if (payload.status !== undefined) {
    payload.completedAt = payload.status === "COMPLETED" ? new Date() : null;
  }
  return prisma.task.update({
    where: { id },
    data: payload,
    include: taskInclude,
  });
}

export async function updateTaskStatus(id, status) {
  return prisma.task.update({
    where: { id },
    data: { status, completedAt: status === "COMPLETED" ? new Date() : null, lastReminderSentAt: null },
    include: taskInclude,
  });
}

export async function deleteTask(id) {
  return prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { entityId: id } });
    return tx.task.delete({ where: { id } });
  });
}

export async function getKanbanTasks(projectId) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: taskInclude,
    orderBy: { createdAt: "desc" },
  });
  return {
    PENDING: tasks.filter((t) => t.status === "PENDING"),
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS"),
    COMPLETED: tasks.filter((t) => t.status === "COMPLETED"),
    DELAYED: tasks.filter((t) => t.status === "DELAYED"),
  };
}

export async function getCalendarTasks(projectId) {
  return prisma.task.findMany({
    where: { projectId, dueDate: { not: null } },
    select: { id: true, title: true, dueDate: true, status: true, priority: true },
    orderBy: { dueDate: "asc" },
  });
}

export async function toggleCommentsDisabled(taskId) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return null;
  return prisma.task.update({
    where: { id: taskId },
    data: { commentsDisabled: !task.commentsDisabled },
  });
}
