import prisma from "../config/prisma.js";

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export async function listTeams(userId) {
  const where = userId
    ? { archived: false, members: { some: { userId } } }
    : { archived: false };
  const teams = await prisma.team.findMany({
    where,
    include: {
      _count: { select: { members: true, projects: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return teams.map((t) => ({
    ...t,
    creatorId: t.creatorId,
  }));
}

export async function getTeam(id) {
  return prisma.team.findUnique({
    where: { id },
    include: { _count: { select: { members: true, projects: true } } },
  });
}

export async function createTeam(data) {
  const slug = slugify(data.name);
  const team = await prisma.team.create({
    data: { ...data, slug },
    include: { _count: { select: { members: true, projects: true } } },
  });
  await prisma.member.create({
    data: { teamId: team.id, userId: data.creatorId, role: "MANAGER" },
  });
  return prisma.team.findUnique({
    where: { id: team.id },
    include: { _count: { select: { members: true, projects: true } } },
  });
}

export async function createTeamWithMembers(data) {
  const { members, ...teamData } = data;
  const slug = slugify(teamData.name);
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: { ...teamData, slug },
    });
    if (members && members.length > 0) {
      for (const m of members) {
        await tx.member.create({
          data: { teamId: team.id, userId: m.userId, role: m.role || "MEMBER" },
        });
      }
    }
    await tx.member.create({
      data: { teamId: team.id, userId: teamData.creatorId, role: "MANAGER" },
    });
    return tx.team.findUnique({
      where: { id: team.id },
      include: { _count: { select: { members: true, projects: true } } },
    });
  });
}

export async function updateTeam(id, data) {
  const patch = { ...data };
  if (data.name) patch.slug = slugify(data.name);
  return prisma.team.update({
    where: { id },
    data: patch,
    include: { _count: { select: { members: true, projects: true } } },
  });
}

export async function archiveTeam(id) {
  return prisma.team.update({
    where: { id },
    data: { archived: true },
  });
}

export async function deleteTeamWithNotifications(tx, teamId) {
  const projectIds = (await tx.project.findMany({ where: { teamId }, select: { id: true } })).map((p) => p.id);
  const taskIds = (await tx.task.findMany({ where: { projectId: { in: projectIds } }, select: { id: true } })).map((t) => t.id);
  await tx.notification.deleteMany({
    where: { entityId: { in: [teamId, ...projectIds, ...taskIds] } },
  });
  return tx.team.delete({ where: { id: teamId } });
}

export async function deleteTeam(id) {
  return prisma.$transaction(async (tx) => deleteTeamWithNotifications(tx, id));
}
