import prisma from "../config/prisma.js";

export async function logActivity(userId, action, entity, entityId, details, teamId, data = null) {
  return prisma.activityLog.create({
    data: { userId, action, entity, entityId, details, data, teamId: teamId || null },
  });
}

export async function listTeamActivity(teamId, { limit = 50 } = {}) {
  return prisma.activityLog.findMany({
    where: { teamId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
