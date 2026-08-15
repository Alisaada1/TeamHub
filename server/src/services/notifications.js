import prisma from "../config/prisma.js";

export async function listNotifications(userId) {
  return prisma.notification.findMany({
    where: { userId },
    include: {
      actor: true,
      team: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function markNotificationRead(id, userId) {
  const notification = await prisma.notification.findUnique({ where: { id }, select: { userId: true } });
  if (!notification) throw new Error("Notification not found");
  if (notification.userId !== userId) throw new Error("Unauthorized");
  return prisma.notification.update({
    where: { id },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return { success: true };
}

export async function getNotificationPreferences(userId) {
  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId },
    });
  }
  return prefs;
}

export async function updateNotificationPreferences(userId, data) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}
