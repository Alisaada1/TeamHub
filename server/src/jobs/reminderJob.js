import cron from "node-cron";
import prisma from "../config/prisma.js";
import { CRON_TIMEZONE } from "../config/env.js";
import { sendTaskReminderEmail } from "../services/email.js";

function endOfTomorrow(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 59, 999);
  return d;
}

async function sendReminder(task, isOverdue) {
  if (!task.assigneeId || !task.assignee?.email) return;
  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: task.assignee.id },
    });
    if (prefs && !prefs.taskReminders) return;

    await sendTaskReminderEmail({
      recipientEmail: task.assignee.email,
      recipientName: task.assignee.name,
      taskTitle: task.title,
      taskDueDate: task.dueDate,
      projectName: task.project?.name,
      teamName: task.project?.team?.name,
      isOverdue,
    });

    const dueLabel = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
      : null;
    const title = `Task "${task.title}" is ${isOverdue ? "overdue" : "due soon"}`;
    const message = dueLabel ? `${title} — due ${dueLabel}` : title;

    await prisma.notification.create({
      data: {
        type: isOverdue ? "OVERDUE" : "DUE_SOON",
        title,
        message,
        entityType: "task",
        entityId: task.id,
        link: task.projectId,
        data: { taskTitle: task.title, dueDate: task.dueDate ? task.dueDate.toISOString() : null },
        teamId: task.project?.teamId || null,
        userId: task.assignee.id,
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: { lastReminderSentAt: new Date() },
    });
  } catch (err) {
    console.error(`Reminder email failed for task ${task.id}:`, err.message);
  }
}

export async function runDueSoonReminders() {
  const now = new Date();
  const dueSoon = await prisma.task.findMany({
    where: {
      dueDate: { gte: now, lte: endOfTomorrow(now) },
      status: { not: "COMPLETED" },
      lastReminderSentAt: null,
    },
    include: {
      assignee: true,
      project: { include: { team: true } },
    },
  });

  for (const task of dueSoon) {
    await sendReminder(task, false);
  }
  return dueSoon.length;
}

export async function runOverdueReminders() {
  const now = new Date();
  const overdue = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { notIn: ["COMPLETED", "DELAYED"] },
      lastReminderSentAt: null,
    },
    include: {
      assignee: true,
      project: { include: { team: true } },
    },
  });

  for (const task of overdue) {
    await sendReminder(task, true);
  }
  return overdue.length;
}

export function startReminderJobs() {
  const opts = CRON_TIMEZONE ? { timezone: CRON_TIMEZONE } : undefined;

  // Daily at 8:00 AM — tasks due within the next ~40 hours
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log("[Reminder] Checking tasks due soon...");
      const count = await runDueSoonReminders();
      console.log(`[Reminder] Sent ${count} due-soon reminders`);
    },
    opts
  );

  // Daily at 9:00 AM — overdue tasks
  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log("[Reminder] Checking overdue tasks...");
      const count = await runOverdueReminders();
      console.log(`[Reminder] Sent ${count} overdue reminders`);
    },
    opts
  );

  console.log(" Cron reminder jobs started");
}
