import * as userService from "../services/users.js";
import * as activityService from "../services/activity.js";
import clerk from "../config/clerk.js";
import { pick } from "../utils/pick.js";

export async function listUsers(req, res, next) {
  try {
    const users = await userService.listUsersForMember(req.userId);
    return res.json({ success: true, data: users, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await userService.getUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, data: null, error: "User not found" });
    if (user.id !== req.userId && !(await userService.sharesTeamWith(req.userId, user.id))) {
      return res.status(403).json({ success: false, data: null, error: "Forbidden" });
    }
    return res.json({ success: true, data: user, error: null });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    if (!req.userId) return res.status(401).json({ success: false, data: null, error: "Not authenticated" });
    const user = await userService.getUser(req.userId);
    if (!user) return res.status(404).json({ success: false, data: null, error: "User not found" });
    return res.json({ success: true, data: user, error: null });
  } catch (err) {
    next(err);
  }
}

export async function updateCurrentUser(req, res, next) {
  try {
    if (!req.userId) return res.status(401).json({ success: false, data: null, error: "Not authenticated" });
    const userData = pick(req.body, ["name", "email", "avatarColor", "imageUrl"]);
    const user = await userService.updateUser(req.userId, userData);
    await activityService.logActivity(req.userId, "UPDATED_PROFILE", "user", req.userId, "Updated profile");
    return res.json({ success: true, data: user, error: null });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    if (!req.userId) return res.status(401).json({ success: false, data: null, error: "Not authenticated" });

    const user = await userService.getUser(req.userId);
    if (!user) return res.status(404).json({ success: false, data: null, error: "User not found" });

    if (user.clerkId) {
      try {
        await clerk.users.deleteUser(user.clerkId);
      } catch (err) {
        const isNotFound = err?.status === 404 || /not found/i.test(err?.message || "");
        if (!isNotFound) {
          return res.status(502).json({
            success: false,
            data: null,
            error: "Failed to delete the account identity. Please try again.",
          });
        }
      }
    }

    await userService.deleteUser(req.userId);
    return res.json({ success: true, data: null, error: null });
  } catch (err) {
    next(err);
  }
}
