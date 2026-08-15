import prisma from "../config/prisma.js";
import { sendNotificationEmail } from "./email.js";

const VALID_ROLES = new Set(["MANAGER", "SUPERVISOR", "MEMBER"]);

export async function inviteUser(teamId, invitedById, email, role, actorRole) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = role || "MEMBER";

  if (!VALID_ROLES.has(normalizedRole)) throw new Error("Invalid role");
  if (actorRole === "SUPERVISOR" && normalizedRole !== "MEMBER") {
    throw new Error("Supervisors can only invite members with the Member role");
  }

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
  if (!team) throw new Error("Team not found");

  const existingMember = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingMember) {
    const alreadyMember = await prisma.member.findUnique({
      where: { userId_teamId: { userId: existingMember.id, teamId } },
    });
    if (alreadyMember) throw new Error("User is already a member of this team");
  }

  const existingInvitation = await prisma.invitation.findUnique({
    where: { email_teamId: { email: normalizedEmail, teamId } },
  });
  if (existingInvitation && existingInvitation.status === "PENDING") {
    throw new Error("Invitation already pending for this email");
  }

  if (existingInvitation && existingInvitation.status !== "PENDING") {
    return prisma.invitation.update({
      where: { id: existingInvitation.id },
      data: { status: "PENDING", role: normalizedRole, invitedById },
      include: { team: { select: { name: true } }, invitedBy: { select: { name: true } } },
    });
  }

  const invitation = await prisma.invitation.create({
    data: {
      email: normalizedEmail,
      role: normalizedRole,
      teamId,
      invitedById,
    },
    include: { team: { select: { name: true } }, invitedBy: { select: { name: true } } },
  });

  if (existingMember) {
    const actor = await prisma.user.findUnique({ where: { id: invitedById }, select: { name: true } });
    const notification = await prisma.notification.create({
      data: {
        type: "INVITATION",
        title: `${actor?.name || "Someone"} has invited you to join the team ${team.name}`,
        message: `${actor?.name || "Someone"} invited you to join ${team.name}`,
        entityType: "team",
        entityId: invitation.id,
        link: teamId,
        data: { teamName: team.name },
        teamId,
        userId: existingMember.id,
        actorId: invitedById,
      },
    });

    try {
      const prefs = await prisma.notificationPreference.findUnique({ where: { userId: existingMember.id } });
      if (!prefs || prefs.emailNotifications) {
        await sendNotificationEmail({
          recipientEmail: existingMember.email,
          recipientName: existingMember.name,
          subject: `[TeamHub] You have been invited to join ${team.name}`,
          notificationTitle: notification.title,
          ctaLink: teamId,
        });
      }
    } catch (emailErr) {
      console.error("Failed to email invitation:", emailErr.message);
    }
  } else {
    try {
      await sendNotificationEmail({
        recipientEmail: normalizedEmail,
        recipientName: normalizedEmail.split("@")[0],
        subject: `[TeamHub] You have been invited to join ${team.name}`,
        notificationTitle: `${invitation.invitedBy?.name || "Someone"} has invited you to join the team ${team.name}`,
        ctaLink: `/signup?invitation=${invitation.id}`,
      });
    } catch (emailErr) {
      console.error("Failed to email invitation:", emailErr.message);
    }
  }

  return invitation;
}

export async function listPendingByTeam(teamId) {
  return prisma.invitation.findMany({
    where: { teamId, status: "PENDING" },
    include: { invitedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listPendingByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  return prisma.invitation.findMany({
    where: { email: normalizedEmail, status: "PENDING" },
    include: { team: { select: { id: true, name: true, color: true } }, invitedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelInvitation(invitationId, userId) {
  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation) throw new Error("Invitation not found");
  if (invitation.invitedById !== userId) {
    const member = await prisma.member.findUnique({
      where: { userId_teamId: { userId, teamId: invitation.teamId } },
    });
    const isManagerOrSupervisor = member && (member.role === "MANAGER" || member.role === "SUPERVISOR");
    if (!isManagerOrSupervisor) throw new Error("Unauthorized");
  }
  if (invitation.status !== "PENDING") throw new Error("Invitation is no longer pending");

  await prisma.invitation.delete({ where: { id: invitationId } });
  return { success: true };
}

export async function acceptInvitation(invitationId, userId) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { team: { select: { name: true } } },
  });
  if (!invitation) throw new Error("Invitation not found");
  if (invitation.status !== "PENDING") throw new Error("Invitation already processed");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) throw new Error("This invitation is for a different email address");

  const existingMember = await prisma.member.findUnique({
    where: { userId_teamId: { userId, teamId: invitation.teamId } },
  });
  if (existingMember) throw new Error("You are already a member of this team");

  const [member] = await prisma.$transaction([
    prisma.member.create({
      data: { userId, teamId: invitation.teamId, role: invitation.role },
    }),
    prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "ACCEPTED" },
    }),
  ]);

  const notification = await prisma.notification.findFirst({
    where: { userId, type: "INVITATION", entityId: invitation.teamId, read: false },
  });
  if (notification) {
    await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });
  }

  if (invitation.invitedById) {
    const accepter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const reverseNotification = await prisma.notification.create({
      data: {
        type: "INVITATION_ACCEPTED",
        title: `${accepter?.name || "Someone"} has accepted your invitation`,
        message: `${accepter?.name || "Someone"} accepted your invitation to join ${invitation.team?.name || "the team"}`,
        entityType: "team",
        entityId: invitation.teamId,
        link: invitation.teamId,
        data: { teamName: invitation.team?.name || null },
        teamId: invitation.teamId,
        userId: invitation.invitedById,
        actorId: userId,
      },
    });

    try {
      const prefs = await prisma.notificationPreference.findUnique({ where: { userId: invitation.invitedById } });
      const actor = await prisma.user.findUnique({ where: { id: invitation.invitedById }, select: { email: true, name: true } });
      if (actor?.email && (!prefs || prefs.emailNotifications)) {
        await sendNotificationEmail({
          recipientEmail: actor.email,
          recipientName: actor.name,
          subject: "[TeamHub] Your invitation was accepted",
          notificationTitle: reverseNotification.title,
          ctaLink: invitation.teamId,
        });
      }
    } catch (emailErr) {
      console.error("Failed to email acceptance:", emailErr.message);
    }
  }

  return member;
}

export async function rejectInvitation(invitationId, userId) {
  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation) throw new Error("Invitation not found");
  if (invitation.status !== "PENDING") throw new Error("Invitation already processed");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error("This invitation is for a different email address");
  }

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "REJECTED" },
  });

  const notification = await prisma.notification.findFirst({
    where: { userId, type: "INVITATION", entityId: invitation.teamId, read: false },
  });
  if (notification) {
    await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });
  }

  if (invitation.invitedById) {
    const rejecter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await prisma.notification.create({
      data: {
        type: "INVITATION_REJECTED",
        title: `${rejecter?.name || "Someone"} has rejected your invitation`,
        message: `${rejecter?.name || "Someone"} rejected your invitation`,
        entityType: "team",
        entityId: invitation.teamId,
        link: invitation.teamId,
        teamId: invitation.teamId,
        userId: invitation.invitedById,
        actorId: userId,
      },
    });
  }

  return { success: true };
}

export async function checkPendingByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  return prisma.invitation.findMany({
    where: { email: normalizedEmail, status: "PENDING" },
    include: { team: { select: { id: true, name: true, color: true } }, invitedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}
