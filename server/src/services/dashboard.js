import prisma from "../config/prisma.js";

export async function getTeamOverview(userId, teamId) {
  const userTeams = await prisma.member.findMany({ where: { userId }, select: { teamId: true } });
  const userTeamIds = userTeams.map((m) => m.teamId);

  if (userTeamIds.length === 0) {
    return { teams: 0, members: 0, projects: 0, tasks: 0 };
  }

  const scopeTeamIds = teamId && userTeamIds.includes(teamId) ? [teamId] : userTeamIds;

  const [teams, members, projects, tasks, currentTeam] = await Promise.all([
    prisma.team.count({ where: { archived: false, id: { in: scopeTeamIds } } }),
    prisma.member.count({ where: { teamId: { in: scopeTeamIds } } }),
    prisma.project.count({ where: { archived: false, teamId: { in: scopeTeamIds } } }),
    prisma.task.count({ where: { project: { teamId: { in: scopeTeamIds } } } }),
    prisma.team.findFirst({ where: { id: { in: scopeTeamIds }, archived: false }, select: { id: true, name: true } }),
  ]);
  return { teams, members, projects, tasks, currentTeamId: currentTeam?.id ?? null, currentTeamName: currentTeam?.name ?? null };
}

export async function getUserOverview(userId, teamId) {
  const scopeTeamIds = await resolveScopeTeamIds(userId, teamId);
  const teamScope = scopeTeamIds.length === 1 ? { project: { teamId: scopeTeamIds[0] } } : {};
  const myTasks = await prisma.task.count({
    where: { assigneeId: userId, ...teamScope },
  });
  const overdueTasks = await prisma.task.count({
    where: {
      assigneeId: userId,
      ...teamScope,
      OR: [
        { dueDate: { lt: new Date() }, status: { not: "COMPLETED" } },
        { status: "DELAYED" },
      ],
    },
  });
  const completedTasks = await prisma.task.count({
    where: { assigneeId: userId, status: "COMPLETED", ...teamScope },
  });
  const inProgressTasks = await prisma.task.count({
    where: { assigneeId: userId, status: "IN_PROGRESS", ...teamScope },
  });
  return { myTasks, overdueTasks, completedTasks, inProgressTasks };
}

export async function getTasksByStatus(userId, teamId) {
  const scopeTeamIds = await resolveScopeTeamIds(userId, teamId);
  if (scopeTeamIds.length === 0) return {};
  const groups = await prisma.task.groupBy({
    by: ["status"],
    where: { project: { teamId: { in: scopeTeamIds } } },
    _count: true,
  });
  const result = {};
  for (const g of groups) result[g.status] = g._count;
  return result;
}

export async function getTasksByPriority(userId, teamId) {
  const scopeTeamIds = await resolveScopeTeamIds(userId, teamId);
  if (scopeTeamIds.length === 0) return {};
  const groups = await prisma.task.groupBy({
    by: ["priority"],
    where: { project: { teamId: { in: scopeTeamIds } } },
    _count: true,
  });
  const result = {};
  for (const g of groups) result[g.priority] = g._count;
  return result;
}

async function resolveScopeTeamIds(userId, teamId) {
  const userTeamIds = userId
    ? (await prisma.member.findMany({ where: { userId }, select: { teamId: true } })).map((m) => m.teamId)
    : [];
  return teamId && userTeamIds.includes(teamId) ? [teamId] : userTeamIds;
}

export async function getMemberWorkload(userId, teamId) {
  const scopeTeamIds = await resolveScopeTeamIds(userId, teamId);
  if (scopeTeamIds.length === 0) return [];
  const members = await prisma.member.findMany({
    where: { teamId: { in: scopeTeamIds } },
    include: {
      user: true,
    },
  });
  const workload = await Promise.all(
    members.map(async (m) => {
      const taskCount = await prisma.task.count({
        where: { assigneeId: m.userId, project: { teamId: { in: scopeTeamIds } } },
      });
      const completedTasks = await prisma.task.count({
        where: { assigneeId: m.userId, status: "COMPLETED", project: { teamId: { in: scopeTeamIds } } },
      });
      return {
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        totalTasks: taskCount,
        completedTasks,
      };
    })
  );
  return workload.filter((w) => w.totalTasks > 0);
}

export async function getDashboardProjects(userId, teamId) {
  const teamIds = await resolveScopeTeamIds(userId, teamId);
  if (teamIds.length === 0) return [];
  const projects = await prisma.project.findMany({
    where: { archived: false, teamId: { in: teamIds } },
    include: {
      team: { select: { name: true, color: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
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

async function getUserRoleInScope(userId, teamId) {
  if (!teamId) return null;
  const member = await prisma.member.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true },
  });
  return member?.role || null;
}

function isTeamWideRole(role) {
  return role === "MANAGER" || role === "SUPERVISOR";
}

async function getDashboardTaskScope(userId, teamId) {
  const teamScope = teamId ? { project: { teamId } } : {};
  const role = await getUserRoleInScope(userId, teamId);
  const where = isTeamWideRole(role) ? teamScope : { assigneeId: userId, ...teamScope };
  return where;
}

export async function getDashboardMyTasks(userId, teamId) {
  const where = await getDashboardTaskScope(userId, teamId);
  return prisma.task.findMany({
    where,
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export async function getDashboardOverdueTasks(userId, teamId) {
  const scope = await getDashboardTaskScope(userId, teamId);
  return prisma.task.findMany({
    where: {
      ...scope,
      OR: [
        { dueDate: { lt: new Date() }, status: { not: "COMPLETED" } },
        { status: "DELAYED" },
      ],
    },
    include: { project: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
    take: 10,
  });
}

export async function getDashboardInProgressTasks(userId, teamId) {
  const scope = await getDashboardTaskScope(userId, teamId);
  return prisma.task.findMany({
    where: { ...scope, status: "IN_PROGRESS" },
    include: { project: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
}

export async function getDashboardRecentActivity(userId, teamId) {
  if (!teamId) return [];
  const isMember = await prisma.member.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { id: true },
  });
  if (!isMember) return [];
  return prisma.activityLog.findMany({
    where: { teamId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}
