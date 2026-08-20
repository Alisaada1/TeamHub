import prisma from "../config/prisma.js";
import { handleMemberExit } from "./members.js";

export async function getUser(id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function listUsersForMember(userId) {
  const teamIds = (
    await prisma.member.findMany({ where: { userId }, select: { teamId: true } })
  ).map((m) => m.teamId);
  if (teamIds.length === 0) return [];
  const memberRows = await prisma.member.findMany({
    where: { teamId: { in: teamIds } },
    distinct: ["userId"],
    select: { userId: true },
  });
  const ids = memberRows.map((m) => m.userId);
  return prisma.user.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" } });
}

export async function sharesTeamWith(userIdA, userIdB) {
  const teamIds = (
    await prisma.member.findMany({ where: { userId: userIdA }, select: { teamId: true } })
  ).map((m) => m.teamId);
  if (teamIds.length === 0) return false;
  const shared = await prisma.member.findFirst({
    where: { userId: userIdB, teamId: { in: teamIds } },
    select: { id: true },
  });
  return Boolean(shared);
}

export async function updateUser(id, data) {
  return prisma.user.update({ where: { id }, data });
}

export async function deleteUser(id) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id },
      select: { id: true, name: true, clerkId: true },
    });
    if (!user) return null;

    const memberTeamIds = (
      await tx.member.findMany({ where: { userId: id }, select: { teamId: true } })
    ).map((m) => m.teamId);
    const createdTeamIds = (
      await tx.team.findMany({ where: { creatorId: id }, select: { id: true } })
    ).map((t) => t.id);

    const handled = new Set();

    for (const teamId of createdTeamIds) {
      if (!memberTeamIds.includes(teamId)) continue;
      await handleMemberExit(tx, {
        teamId,
        userId: id,
        leaverName: user.name,
        reason: "deleted_account",
      });
      handled.add(teamId);
    }

    for (const teamId of memberTeamIds) {
      if (handled.has(teamId)) continue;
      await handleMemberExit(tx, {
        teamId,
        userId: id,
        leaverName: user.name,
        reason: "deleted_account",
      });
    }

    // Teams the user created but is no longer a member of: transfer the creator
    // to the oldest remaining member (or null it out) so they are not cascaded.
    for (const teamId of createdTeamIds) {
      if (handled.has(teamId)) continue;
      const remaining = await tx.member.findMany({
        where: { teamId, userId: { not: id } },
        orderBy: { joinedAt: "asc" },
        take: 1,
        select: { userId: true },
      });
      await tx.team.update({
        where: { id: teamId },
        data: { creatorId: remaining[0]?.userId ?? null },
      });
    }

    // Preserve teammates' shared work by detaching authorship and assignment.
    await tx.project.updateMany({ where: { creatorId: id }, data: { creatorId: null } });
    await tx.task.updateMany({ where: { creatorId: id }, data: { creatorId: null } });
    await tx.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } });
    await tx.comment.updateMany({ where: { authorId: id }, data: { authorId: null } });
    await tx.invitation.deleteMany({ where: { invitedById: id } });

    await tx.user.delete({ where: { id } });
    return { success: true };
  });
}
