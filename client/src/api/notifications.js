import client from "./client";

export async function listNotifications(userId) {
  const { data } = await client.get("/notifications", { params: { userId } });
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await client.patch(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(userId) {
  const { data } = await client.patch("/notifications/read-all", { userId });
  return data;
}

export async function getNotificationPreferences(userId) {
  const { data } = await client.get("/notifications/preferences", { params: { userId } });
  return data;
}

export async function updateNotificationPreferences(userId, prefs) {
  const { data } = await client.put("/notifications/preferences", { userId, ...prefs });
  return data;
}
