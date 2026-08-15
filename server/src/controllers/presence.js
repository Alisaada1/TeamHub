import * as presenceService from "../services/presence.js";

export async function heartbeat(req, res, next) {
  try {
    if (!req.userId) return res.status(401).json({ success: false, data: null, error: "Not authenticated" });
    await presenceService.touchLastSeen(req.userId);
    return res.json({ success: true, data: null, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getOnlineUsers(req, res, next) {
  try {
    if (!req.userId) return res.status(401).json({ success: false, data: null, error: "Not authenticated" });
    const userIds = await presenceService.getOnlineUserIds();
    return res.json({ success: true, data: userIds, error: null });
  } catch (err) {
    next(err);
  }
}
