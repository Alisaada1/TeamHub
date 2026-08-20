import prisma from "../config/prisma.js";

export function requireTeamRole(...roles) {
  return async (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ success: false, data: null, error: "Authentication required" });
    }

    const teamId = req.params.teamId || req.params.id;
    if (!teamId) {
      return res.status(400).json({ success: false, data: null, error: "Team ID required" });
    }

    try {
      const member = await prisma.member.findUnique({
        where: { userId_teamId: { userId: req.userId, teamId } },
      });

      if (!member) {
        return res.status(403).json({ success: false, data: null, error: "You are not a member of this team" });
      }

      if (!roles.includes(member.role)) {
        return res.status(403).json({ success: false, data: null, error: `Requires one of roles: ${roles.join(", ")}` });
      }

      req.userRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
