import prisma from "../config/prisma.js";
import { deleteTeamWithNotifications } from "./teams.js";

export async function listMembers(teamId) {
  return prisma.member.findMany({
    where: { teamId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });
}

export const VALID_ROLES = new Set(["MANAGER", "SUPERVISOR", "MEMBER"]);

export async function addMember(teamId, data, actorRole) {
  const role = data.role || "MEMBER";
  if (!VALID_ROLES.has(role)) throw new Error("Invalid role");
  if (actorRole === "SUPERVISOR" && role !== "MEMBER") {
    throw new Error("Supervisors can only add members with the Member role");
  }
  return prisma.member.create({
    data: { teamId, userId: data.userId, role },
    include: { user: true },
  });
}

export async function updateMemberRole(teamId, userId, role) {
  const member = await prisma.member.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  if (!member) return null;
  if (!VALID_ROLES.has(role)) throw new Error("Invalid role");

  if (member.role === "MANAGER" && role !== "MANAGER") {
    const managerCount = await prisma.member.count({
      where: { teamId, role: "MANAGER" },
    });
    if (managerCount <= 1) {
      throw new Error("Cannot demote the last Manager. Promote another member first.");
    }
  }

  return prisma.member.update({
    where: { id: member.id },
    data: { role },
    include: { user: true },
  });
}

export async function removeMember(teamId, userId) {
  const member = await prisma.member.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  if (!member) return null;

  if (member.role === "MANAGER") {
    const managerCount = await prisma.member.count({
      where: { teamId, role: "MANAGER" },
    });
    if (managerCount <= 1) {
      throw new Error("Cannot remove the last Manager. Promote another member first.");
    }
  }

  return prisma.member.delete({ where: { id: member.id } });
}

export async function restoreMember(teamId, userId) {
  return prisma.member.create({
    data: { teamId, userId, role: "MEMBER" },
    include: { user: true },
  });
}

export async function handleMemberExit(tx, { teamId, userId, leaverName, reason }) {
  const remaining = await tx.member.findMany({
    where: { teamId, userId: { not: userId } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "asc" },
  });

  if (remaining.length === 0) {
    await deleteTeamWithNotifications(tx, teamId);
    return { deletedTeamId: teamId };
  }

  await tx.member.delete({
    where: { userId_teamId: { userId, teamId } },
  });

  const team = await tx.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, creatorId: true },
  });

  if (team?.creatorId === userId) {
    const successor = remaining.find((m) => m.role === "MANAGER") || remaining[0];
    await tx.team.update({
      where: { id: teamId },
      data: { creatorId: successor.userId },
    });
  }

  const message =
    reason === "deleted_account"
      ? `${leaverName} deleted their account and left the team`
      : `${leaverName} has left the team`;

  for (const m of remaining) {
    await tx.notification.create({
      data: {
        type: "MEMBER_LEFT",
        title: message,
        message,
        entityType: "team",
        entityId: teamId,
        link: teamId,
        teamId,
        userId: m.userId,
        actorId: userId,
      },
    });
  }

  await tx.activityLog.create({
    data: {
      action: "MEMBER_LEFT",
      entity: "team",
      entityId: teamId,
      details: `${message} "${team?.name || ""}"`.trim(),
      userId,
      teamId,
    },
  });

  return { teamId, remaining: remaining.map((m) => m.userId) };
}

export async function leaveTeam(userId, teamId) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.member.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!member) return null;

    const leaver = await tx.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    return handleMemberExit(tx, {
      teamId,
      userId,
      leaverName: leaver?.name || "A user",
      reason: "left",
    });
  });
}
