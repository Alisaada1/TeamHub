import { Router } from "express";
import { Webhook } from "svix";
import { CLERK_WEBHOOK_SECRET } from "../config/env.js";
import prisma from "../config/prisma.js";
import { handleMemberExit } from "../services/members.js";

const router = Router();

router.post("/clerk", async (req, res) => {
  if (!CLERK_WEBHOOK_SECRET) {
    console.warn("CLERK_WEBHOOK_SECRET not set — skipping webhook verification");
    return res.status(503).json({ error: "Webhook secret not configured" });
  }

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);
  let event;

  try {
    const svixId = req.headers["svix-id"];
    const svixTimestamp = req.headers["svix-timestamp"];
    const svixSignature = req.headers["svix-signature"];

    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(400).json({ error: "Missing Svix headers" });
    }

    event = wh.verify(req.body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("Webhook verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (event.type === "user.deleted") {
    const clerkId = event.data.id;

    try {
      const user = await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true, name: true },
      });

      if (user) {
        await deleteUserCascade(user.id, user.name);
        console.log(`Webhook: cleaned up user ${user.id} (${user.name}) after Clerk deletion`);
      }
    } catch (err) {
      console.error("Webhook user.deleted cleanup failed:", err);
      return res.status(500).json({ error: "Cleanup failed" });
    }
  }

  res.json({ received: true });
});

async function deleteUserCascade(userId, userName) {
  return prisma.$transaction(async (tx) => {
    const memberTeamIds = (
      await tx.member.findMany({ where: { userId }, select: { teamId: true } })
    ).map((m) => m.teamId);

    const createdTeamIds = (
      await tx.team.findMany({ where: { creatorId: userId }, select: { id: true } })
    ).map((t) => t.id);

    const handled = new Set();

    for (const teamId of createdTeamIds) {
      if (!memberTeamIds.includes(teamId)) continue;
      await handleMemberExit(tx, {
        teamId,
        userId,
        leaverName: userName,
        reason: "deleted_account",
      });
      handled.add(teamId);
    }

    for (const teamId of memberTeamIds) {
      if (handled.has(teamId)) continue;
      await handleMemberExit(tx, {
        teamId,
        userId,
        leaverName: userName,
        reason: "deleted_account",
      });
    }

    for (const teamId of createdTeamIds) {
      if (handled.has(teamId)) continue;
      const remaining = await tx.member.findMany({
        where: { teamId, userId: { not: userId } },
        orderBy: { joinedAt: "asc" },
        take: 1,
        select: { userId: true },
      });
      await tx.team.update({
        where: { id: teamId },
        data: { creatorId: remaining[0]?.userId ?? null },
      });
    }

    await tx.project.updateMany({ where: { creatorId: userId }, data: { creatorId: null } });
    await tx.task.updateMany({ where: { creatorId: userId }, data: { creatorId: null } });
    await tx.task.updateMany({ where: { assigneeId: userId }, data: { assigneeId: null } });
    await tx.comment.updateMany({ where: { authorId: userId }, data: { authorId: null } });
    await tx.invitation.deleteMany({ where: { invitedById: userId } });

    await tx.user.delete({ where: { id: userId } });
  });
}

export default router;
