import { Router } from "express";
import { listTeams, getTeam, createTeam, createTeamWithMembers, updateTeam, archiveTeam, deleteTeam } from "../controllers/teams.js";
import { createProject } from "../controllers/projects.js";
import { requireTeamRole } from "../middleware/auth.js";
import { validate, required } from "../middleware/validate.js";

const router = Router();

router.get("/", listTeams);
router.get("/:id", requireTeamRole("MANAGER", "SUPERVISOR", "MEMBER"), getTeam);
router.post("/", validate({ name: [required] }), createTeam);
router.post("/with-members", validate({ name: [required] }), createTeamWithMembers);
router.put("/:id", requireTeamRole("MANAGER"), validate({ name: [required] }), updateTeam);
router.patch("/:id/archive", requireTeamRole("MANAGER"), archiveTeam);
router.delete("/:id", requireTeamRole("MANAGER"), deleteTeam);

// Project scoped under team routes (called by frontend)
router.post("/:teamId/projects", requireTeamRole("MANAGER", "SUPERVISOR"), validate({ name: [required] }), createProject);

export default router;
