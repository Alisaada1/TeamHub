import * as teamService from "../services/teams.js";
import * as activityService from "../services/activity.js";
import { pick } from "../utils/pick.js";

function ok(res, data, pagination) {
  return res.json({ success: true, data, error: null, pagination });
}

export async function listTeams(req, res, next) {
  try {
    const teams = await teamService.listTeams(req.userId);
    return ok(res, teams, { page: 1, limit: 50, total: teams.length });
  } catch (err) {
    next(err);
  }
}

export async function getTeam(req, res, next) {
  try {
    const team = await teamService.getTeam(req.params.id);
    if (!team) return res.status(404).json({ success: false, data: null, error: "Team not found" });
    return ok(res, team);
  } catch (err) {
    next(err);
  }
}

export async function createTeam(req, res, next) {
  try {
    const teamData = pick(req.body, ["name", "description", "color"]);
    const team = await teamService.createTeam({ ...teamData, creatorId: req.userId });
    await activityService.logActivity(req.userId, "CREATED_TEAM", "team", team.id, `Created team "${team.name}"`, team.id, { team: team.name });
    return res.status(201).json({ success: true, data: team, error: null });
  } catch (err) {
    next(err);
  }
}

export async function createTeamWithMembers(req, res, next) {
  try {
    const teamData = pick(req.body, ["name", "description", "color", "members"]);
    const team = await teamService.createTeamWithMembers({ ...teamData, creatorId: req.userId });
    await activityService.logActivity(req.userId, "CREATED_TEAM", "team", team.id, `Created team "${team.name}" with members`, team.id, { team: team.name });
    return res.status(201).json({ success: true, data: team, error: null });
  } catch (err) {
    next(err);
  }
}

export async function updateTeam(req, res, next) {
  try {
    const teamData = pick(req.body, ["name", "description", "color"]);
    const team = await teamService.updateTeam(req.params.id, teamData);
    await activityService.logActivity(req.userId, "UPDATED_TEAM", "team", team.id, `Updated team "${team.name}"`, team.id, { team: team.name });
    return ok(res, team);
  } catch (err) {
    next(err);
  }
}

export async function archiveTeam(req, res, next) {
  try {
    const team = await teamService.archiveTeam(req.params.id);
    return ok(res, team);
  } catch (err) {
    next(err);
  }
}

export async function deleteTeam(req, res, next) {
  try {
    const team = await teamService.deleteTeam(req.params.id);
    await activityService.logActivity(req.userId, "DELETED_TEAM", "team", req.params.id, `Deleted team "${team.name}"`, null, { team: team.name });
    return ok(res, team);
  } catch (err) {
    next(err);
  }
}
