import prisma from "../config/prisma.js";

export async function listProjects(userId, teamId) {
  if (!userId) return [];
  let where;
  if (teamId) {
    const isMember = await prisma.member.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!isMember) return [];
    where = { teamId, archived: false };
  } else if (userId) {
    const userTeamIds = (await prisma.member.findMany({ where: { userId }, select: { teamId: true } })).map((m) => m.teamId);
    if (userTeamIds.length === 0) return [];
    where = { teamId: { in: userTeamIds }, archived: false };
  } else {
    return [];
  }
  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  const projectIds = projects.map(p => p.id);
  const taskCounts = await prisma.task.groupBy({
    by: ["projectId"],
    where: { projectId: { in: projectIds } },
    _count: true,
  });
  const completedCounts = await prisma.task.groupBy({
    by: ["projectId"],
    where: { projectId: { in: projectIds }, status: "COMPLETED" },
    _count: true,
  });
  const totalMap = Object.fromEntries(taskCounts.map(c => [c.projectId, c._count]));
  const completedMap = Object.fromEntries(completedCounts.map(c => [c.projectId, c._count]));
  return projects.map(p => ({
    ...p,
    _count: { tasks: totalMap[p.id] || 0, completedTasks: completedMap[p.id] || 0 },
  }));
}

export async function getProject(id) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { team: true },
  });
  if (!project) return null;
  const [totalCount, completedCount] = await Promise.all([
    prisma.task.count({ where: { projectId: id } }),
    prisma.task.count({ where: { projectId: id, status: "COMPLETED" } }),
  ]);
  return { ...project, _count: { tasks: totalCount, completedTasks: completedCount } };
}

export async function createProject(teamId, data) {
  const project = await prisma.project.create({
    data: { ...data, teamId },
  });
  return { ...project, _count: { tasks: 0, completedTasks: 0 } };
}

export async function updateProject(id, data) {
  const project = await prisma.project.update({ where: { id }, data });
  const [totalCount, completedCount] = await Promise.all([
    prisma.task.count({ where: { projectId: id } }),
    prisma.task.count({ where: { projectId: id, status: "COMPLETED" } }),
  ]);
  return { ...project, _count: { tasks: totalCount, completedTasks: completedCount } };
}

export async function deleteProject(id) {
  return prisma.$transaction(async (tx) => {
    const taskIds = (await tx.task.findMany({ where: { projectId: id }, select: { id: true } })).map((t) => t.id);
    await tx.notification.deleteMany({
      where: { entityId: { in: [id, ...taskIds] } },
    });
    return tx.project.delete({ where: { id } });
  });
}

export async function getProjectStats(projectId) {
  const tasks = await prisma.task.findMany({ where: { projectId } });
  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "PENDING").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
    delayed: tasks.filter((t) => t.status === "DELAYED").length,
  };
}

export async function archiveProject(id) {
  return prisma.project.update({
    where: { id },
    data: { archived: true },
  });
}
