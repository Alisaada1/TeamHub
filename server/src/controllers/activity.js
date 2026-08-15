import prisma from "../config/prisma.js";
import * as activityService from "../services/activity.js";

export async function listActivity(req, res, next) {
  try {
    const { teamId } = req.query;
    if (!teamId) {
      return res.json({ success: true, data: [], error: null });
    }
    const member = await prisma.member.findUnique({
      where: { userId_teamId: { userId: req.userId, teamId } },
    });
    if (!member) {
      return res.status(403).json({ success: false, data: null, error: "You are not a member of this team" });
    }
    const logs = await activityService.listTeamActivity(teamId, { limit: 50 });
    return res.json({ success: true, data: logs, error: null });
  } catch (err) {
    next(err);
  }
}
