import { Router } from "express";
import { inviteUser, listPendingByTeam, listPendingByEmail, cancelInvitation, acceptInvitation, rejectInvitation } from "../controllers/invitations.js";
import { requireTeamRole } from "../middleware/auth.js";
import { validate, required, isEmail } from "../middleware/validate.js";

const router = Router();

router.get("/pending", listPendingByEmail);
router.get("/team/:teamId", requireTeamRole("MANAGER", "SUPERVISOR", "MEMBER"), listPendingByTeam);
router.post("/team/:teamId", requireTeamRole("MANAGER", "SUPERVISOR"), validate({ email: [required, isEmail] }), inviteUser);
router.delete("/:id", cancelInvitation);
router.post("/:id/accept", acceptInvitation);
router.post("/:id/reject", rejectInvitation);

export default router;
