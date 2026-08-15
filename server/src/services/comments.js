import prisma from "../config/prisma.js";

export async function listTaskComments(taskId) {
  return prisma.comment.findMany({
    where: { taskId },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function addTaskComment(taskId, data) {
  return prisma.comment.create({
    data: { taskId, body: data.body, authorId: data.authorId },
    include: { author: true },
  });
}

export async function togglePinComment(commentId) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return null;
  return prisma.comment.update({
    where: { id: commentId },
    data: { pinned: !comment.pinned },
    include: { author: true },
  });
}

export async function updateComment(commentId, userId, body) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return null;
  if (comment.authorId !== userId) {
    throw new Error("You can only edit your own comments");
  }
  return prisma.comment.update({
    where: { id: commentId },
    data: { body },
    include: { author: true },
  });
}

export async function deleteComment(commentId, userId, memberRole) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return null;
  const isAuthor = comment.authorId === userId;
  const isManagerOrSupervisor = memberRole === "MANAGER" || memberRole === "SUPERVISOR";
  if (!isAuthor && !isManagerOrSupervisor) {
    throw new Error("You can only delete your own comments");
  }
  return prisma.comment.delete({ where: { id: commentId } });
}

export async function getPinnedComments(taskId) {
  return prisma.comment.findMany({
    where: { taskId, pinned: true },
    include: { author: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPinnedCommentsForUser(userId, teamId) {
  const userTeams = await prisma.member.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const userTeamIds = userTeams.map((m) => m.teamId);
  if (userTeamIds.length === 0) return [];
  if (teamId && !userTeamIds.includes(teamId)) return [];

  const teamIds = teamId ? [teamId] : userTeamIds;

  return prisma.comment.findMany({
    where: {
      pinned: true,
      task: {
        project: { teamId: { in: teamIds } },
      },
    },
    include: {
      author: true,
      task: {
        select: { id: true, title: true, project: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
