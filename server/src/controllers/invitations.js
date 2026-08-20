import * as invitationService from "../services/invitations.js";
import prisma from "../config/prisma.js";

export async function lookupInvitation(req, res, next) {
  try {
    const invitation = await invitationService.lookupInvitation(req.params.id);
    if (!invitation) return res.status(404).json({ success: false, data: null, error: "Invitation not found" });
    return res.json({ success: true, data: { email: invitation.email, teamName: invitation.team?.name || null }, error: null });
  } catch (err) {
    next(err);
  }
}

export async function inviteUser(req, res, next) {
  try {
    const { email, role } = req.body;
    const { teamId } = req.params;
    if (!email) return res.status(400).json({ success: false, data: null, error: "Email is required" });
    const actorMember = await prisma.member.findUnique({
      where: { userId_teamId: { userId: req.userId, teamId } },
    });
    const invitation = await invitationService.inviteUser(teamId, req.userId, email, role || "MEMBER", actorMember?.role);
    return res.status(201).json({ success: true, data: invitation, error: null });
  } catch (err) {
    if (["User is already a member of this team", "Invitation already pending for this email", "Team not found"].includes(err.message)) {
      return res.status(400).json({ success: false, data: null, error: err.message });
    }
    if (err.message === "Invalid role" || err.message?.startsWith("Supervisors can only")) {
      return res.status(403).json({ success: false, data: null, error: err.message });
    }
    next(err);
  }
}

export async function listPendingByTeam(req, res, next) {
  try {
    const invitations = await invitationService.listPendingByTeam(req.params.teamId);
    return res.json({ success: true, data: invitations, error: null });
  } catch (err) {
    next(err);
  }
}

export async function listPendingByEmail(req, res, next) {
  try {
    const invitations = await invitationService.listPendingByEmail(req.user.email);
    return res.json({ success: true, data: invitations, error: null });
  } catch (err) {
    next(err);
  }
}

export async function cancelInvitation(req, res, next) {
  try {
    await invitationService.cancelInvitation(req.params.id, req.userId);
    return res.json({ success: true, data: null, error: null });
  } catch (err) {
    if (err.message === "Invitation not found") return res.status(404).json({ success: false, data: null, error: err.message });
    if (err.message === "Unauthorized") return res.status(403).json({ success: false, data: null, error: err.message });
    if (err.message === "Invitation is no longer pending") return res.status(400).json({ success: false, data: null, error: err.message });
    next(err);
  }
}

export async function acceptInvitation(req, res, next) {
  try {
    const member = await invitationService.acceptInvitation(req.params.id, req.userId);
    return res.json({ success: true, data: member, error: null });
  } catch (err) {
    if (err.message === "Invitation not found") return res.status(404).json({ success: false, data: null, error: err.message });
    return res.status(400).json({ success: false, data: null, error: err.message });
  }
}

export async function rejectInvitation(req, res, next) {
  try {
    const result = await invitationService.rejectInvitation(req.params.id, req.userId);
    return res.json({ success: true, data: result, error: null });
  } catch (err) {
    if (err.message === "Invitation not found") return res.status(404).json({ success: false, data: null, error: err.message });
    return res.status(400).json({ success: false, data: null, error: err.message });
  }
}
