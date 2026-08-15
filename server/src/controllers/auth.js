import * as authService from "../services/auth.js";
import * as activityService from "../services/activity.js";

export async function signIn(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, data: null, error: "Email is required" });
    const user = await authService.findOrCreateUser(email, null);
    return res.json({ success: true, data: user, error: null });
  } catch (err) {
    next(err);
  }
}

export async function signUp(req, res, next) {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, data: null, error: "Name and email are required" });
    const existing = await authService.findUserByEmail(email);
    if (existing) return res.status(409).json({ success: false, data: null, error: "Email already in use" });
    const user = await authService.createUser({ name, email });
    await activityService.logActivity(user.id, "SIGNED_UP", "user", user.id, "User signed up");
    return res.status(201).json({ success: true, data: user, error: null });
  } catch (err) {
    next(err);
  }
}


