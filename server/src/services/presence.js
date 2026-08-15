import prisma from "../config/prisma.js";

export const ONLINE_WINDOW_MS = 60 * 1000;

export async function touchLastSeen(userId) {
  if (!userId) return null;
  return prisma.user.update({
    where: { id: userId },
    data: { lastSeenAt: new Date() },
    select: { id: true, lastSeenAt: true },
  });
}

export async function getOnlineUserIds(windowMs = ONLINE_WINDOW_MS) {
  const cutoff = new Date(Date.now() - windowMs);
  const users = await prisma.user.findMany({
    where: { lastSeenAt: { gte: cutoff } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}
