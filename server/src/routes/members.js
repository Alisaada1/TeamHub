import { Router } from "express";
import { listMembers, addMember, updateMemberRole, removeMember, leaveTeam, restoreMember } from "../controllers/members.js";
import { requireTeamRole } from "../middleware/auth.js";
import { validate, required } from "../middleware/validate.js";

const router = Router();

router.get("/teams/:teamId/members", requireTeamRole("MANAGER", "SUPERVISOR", "MEMBER"), listMembers);
router.post("/teams/:teamId/members", requireTeamRole("MANAGER", "SUPERVISOR"), validate({ userId: [required] }), addMember);
router.patch("/teams/:teamId/members/:userId", requireTeamRole("MANAGER"), validate({ role: [required] }), updateMemberRole);
router.delete("/teams/:teamId/members/:userId", requireTeamRole("MANAGER"), removeMember);
router.delete("/teams/:teamId/leave", requireTeamRole("MANAGER", "SUPERVISOR", "MEMBER"), leaveTeam);
router.post("/teams/:teamId/members/:userId/restore", requireTeamRole("MANAGER"), restoreMember);

export default router;
