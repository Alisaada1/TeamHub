import * as memberService from "../services/members.js";
import * as activityService from "../services/activity.js";
import { sendNotificationEmail } from "../services/email.js";
import prisma from "../config/prisma.js";

export async function listMembers(req, res, next) {
  try {
    const members = await memberService.listMembers(req.params.teamId);
    return res.json({ success: true, data: members, error: null });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req, res, next) {
  try {
    const actorMember = await prisma.member.findUnique({
      where: { userId_teamId: { userId: req.userId, teamId: req.params.teamId } },
    });
    const member = await memberService.addMember(req.params.teamId, req.body, actorMember?.role);
    await activityService.logActivity(req.userId, "ADDED_MEMBER", "member", member.id, "Added team member", req.params.teamId);

    const [actor, team] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.userId }, select: { name: true } }),
      prisma.team.findUnique({ where: { id: req.params.teamId }, select: { name: true } }),
    ]);
    const notification = await prisma.notification.create({
      data: {
        type: "MEMBER_ADDED",
        title: `${actor?.name || "Someone"} added you to the team ${team?.name || "the team"}`,
        message: `${actor?.name || "Someone"} added you to ${team?.name || "a team"}`,
        entityType: "team",
        entityId: req.params.teamId,
        link: req.params.teamId,
        data: { teamName: team?.name || null },
        teamId: req.params.teamId,
        userId: member.userId,
        actorId: req.userId,
      },
    });

    const addedUser = await prisma.user.findUnique({ where: { id: member.userId }, select: { email: true, name: true } });
    if (addedUser?.email) {
      try {
        const prefs = await prisma.notificationPreference.findUnique({ where: { userId: member.userId } });
        if (!prefs || prefs.emailNotifications) {
          await sendNotificationEmail({
            recipientEmail: addedUser.email,
            recipientName: addedUser.name,
            subject: "[TeamHub] You have been added to a team",
            notificationTitle: notification.title,
            ctaLink: req.params.teamId,
          });
        }
      } catch (emailErr) {
        console.error("Failed to email add-member notification:", emailErr.message);
      }
    }

    return res.status(201).json({ success: true, data: member, error: null });
  } catch (err) {
    if (err.message === "Invalid role" || err.message?.startsWith("Supervisors can only")) {
      return res.status(403).json({ success: false, data: null, error: err.message });
    }
    next(err);
  }
}

export async function updateMemberRole(req, res, next) {
  try {
    const { teamId, userId } = req.params;
    const { role } = req.body;
    const member = await memberService.updateMemberRole(teamId, userId, role);
    if (!member) return res.status(404).json({ success: false, data: null, error: "Member not found" });
    await activityService.logActivity(req.userId, "UPDATED_MEMBER_ROLE", "member", member.id, `Changed role to ${role}`, teamId, { role });

    const roleLabel = { MANAGER: "Manager", SUPERVISOR: "Supervisor", MEMBER: "Member" }[role] || role;

    const [actor, team] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.userId }, select: { name: true } }),
      prisma.team.findUnique({ where: { id: teamId }, select: { name: true } }),
    ]);
    const notification = await prisma.notification.create({
      data: {
        type: "ROLE_CHANGED",
        title: `${actor?.name || "Someone"} changed your role to ${roleLabel}`,
        message: `Your role was changed to ${roleLabel} in ${team?.name || "the team"}`,
        entityType: "team",
        entityId: teamId,
        link: teamId,
        data: { role },
        teamId,
        userId,
        actorId: req.userId,
      },
    });

    const changedUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (changedUser?.email) {
      try {
        const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
        if (!prefs || prefs.emailNotifications) {
          await sendNotificationEmail({
            recipientEmail: changedUser.email,
            recipientName: changedUser.name,
            subject: "[TeamHub] Your role has been updated",
            notificationTitle: notification.title,
            ctaLink: teamId,
          });
        }
      } catch (emailErr) {
        console.error("Failed to email role-change notification:", emailErr.message);
      }
    }

    return res.json({ success: true, data: member, error: null });
  } catch (err) {
    if (err.message?.startsWith("Cannot demote") || err.message?.startsWith("Cannot remove")) {
      return res.status(400).json({ success: false, data: null, error: err.message });
    }
    next(err);
  }
}

export async function removeMember(req, res, next) {
  try {
    const { teamId, userId } = req.params;
    const member = await memberService.removeMember(teamId, userId);
    if (!member) return res.status(404).json({ success: false, data: null, error: "Member not found" });
    await activityService.logActivity(req.userId, "REMOVED_MEMBER", "member", member.id, "Removed team member", teamId);

    const actor = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true } });
    const notification = await prisma.notification.create({
      data: {
        type: "MEMBER_REMOVED",
        title: `You have been removed from the team by ${actor?.name || "the creator"}`,
        message: `${actor?.name || "The creator"} removed you from the team`,
        entityType: "team",
        entityId: teamId,
        link: teamId,
        teamId,
        userId,
        actorId: req.userId,
      },
    });

    const removedUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (removedUser?.email) {
      try {
        const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
        if (!prefs || prefs.emailNotifications) {
          await sendNotificationEmail({
            recipientEmail: removedUser.email,
            recipientName: removedUser.name,
            subject: "[TeamHub] You have been removed from a team",
            notificationTitle: notification.title,
            ctaLink: teamId,
          });
        }
      } catch (emailErr) {
        console.error("Failed to email removal notification:", emailErr.message);
      }
    }

    return res.json({ success: true, data: member, error: null });
  } catch (err) {
    if (err.message?.startsWith("Cannot remove")) {
      return res.status(400).json({ success: false, data: null, error: err.message });
    }
    next(err);
  }
}

export async function leaveTeam(req, res, next) {
  try {
    const result = await memberService.leaveTeam(req.userId, req.params.teamId);
    if (!result) return res.status(404).json({ success: false, data: null, error: "Membership not found" });
    return res.json({ success: true, data: result, error: null });
  } catch (err) {
    next(err);
  }
}

export async function restoreMember(req, res, next) {
  try {
    const { teamId, userId } = req.params;
    const member = await memberService.restoreMember(teamId, userId);
    return res.status(201).json({ success: true, data: member, error: null });
  } catch (err) {
    next(err);
  }
}
