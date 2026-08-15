import * as notificationService from "../services/notifications.js";

export async function listNotifications(req, res, next) {
  try {
    const notifications = await notificationService.listNotifications(req.userId);
    return res.json({ success: true, data: notifications, error: null });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const notification = await notificationService.markNotificationRead(req.params.id, req.userId);
    return res.json({ success: true, data: notification, error: null });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await notificationService.markAllNotificationsRead(req.userId);
    return res.json({ success: true, data: result, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getNotificationPreferences(req, res, next) {
  try {
    const prefs = await notificationService.getNotificationPreferences(req.userId);
    return res.json({ success: true, data: prefs, error: null });
  } catch (err) {
    next(err);
  }
}

export async function updateNotificationPreferences(req, res, next) {
  try {
    const prefs = await notificationService.updateNotificationPreferences(req.userId, req.body);
    return res.json({ success: true, data: prefs, error: null });
  } catch (err) {
    next(err);
  }
}
