import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("node-cron", () => {
  const schedule = vi.fn().mockReturnValue({ start: vi.fn() });
  return { default: { schedule }, schedule };
});

vi.mock("../src/services/email.js", () => ({
  sendTaskReminderEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/config/prisma.js", () => {
  const prismaMock = {
    task: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn().mockResolvedValue({}) },
    notification: { create: vi.fn().mockResolvedValue({}) },
    notificationPreference: { findUnique: vi.fn().mockResolvedValue(null) },
  };
  return { default: prismaMock };
});

import prisma from "../src/config/prisma.js";
import { sendTaskReminderEmail } from "../src/services/email.js";
import cron from "node-cron";
import { runDueSoonReminders, runOverdueReminders, startReminderJobs } from "../src/jobs/reminderJob.js";

const dueSoonTask = {
  id: "t1",
  title: "Design review",
  dueDate: new Date(Date.now() + 24 * 3600 * 1000),
  status: "PENDING",
  assigneeId: "u_a",
  projectId: "p1",
  assignee: { id: "u_a", name: "A", email: "a@example.com" },
  project: { name: "Website", teamId: "team1", team: { name: "Design" } },
};

const overdueTask = { ...dueSoonTask, id: "t2", dueDate: new Date(Date.now() - 3600 * 1000), status: "IN_PROGRESS" };

beforeEach(() => {
  vi.clearAllMocks();
  prisma.task.findMany.mockResolvedValue([]);
});

describe("runDueSoonReminders", () => {
  it("emails assignee, creates DUE_SOON bell notification, and marks lastReminderSentAt", async () => {
    prisma.task.findMany.mockResolvedValue([dueSoonTask]);

    const count = await runDueSoonReminders();

    expect(count).toBe(1);
    expect(sendTaskReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: "a@example.com",
        taskTitle: "Design review",
        isOverdue: false,
      })
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "DUE_SOON",
          userId: "u_a",
          entityId: "t1",
          link: "p1",
          teamId: "team1",
        }),
      })
    );
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { lastReminderSentAt: expect.any(Date) },
    });
  });

  it("queries only tasks that have not been reminded yet (dedup filter)", async () => {
    await runDueSoonReminders();

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ lastReminderSentAt: null, status: { not: "COMPLETED" } }),
      })
    );
  });

  it("skips a task when the assignee preference disables reminders", async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue({ taskReminders: false });
    prisma.task.findMany.mockResolvedValue([dueSoonTask]);

    const count = await runDueSoonReminders();

    expect(count).toBe(1);
    expect(sendTaskReminderEmail).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(prisma.task.update).not.toHaveBeenCalled();
  });

  it("sends when preferences explicitly enable reminders", async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue({ taskReminders: true });
    prisma.task.findMany.mockResolvedValue([dueSoonTask]);

    await runDueSoonReminders();

    expect(sendTaskReminderEmail).toHaveBeenCalledTimes(1);
  });

  it("skips a task whose assignee has no email", async () => {
    prisma.task.findMany.mockResolvedValue([
      { ...dueSoonTask, assignee: { id: "u_a", name: "A", email: null } },
    ]);

    const count = await runDueSoonReminders();

    expect(count).toBe(1);
    expect(sendTaskReminderEmail).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

describe("runOverdueReminders", () => {
  it("creates OVERDUE notification and sends email with isOverdue=true", async () => {
    prisma.task.findMany.mockResolvedValue([overdueTask]);

    const count = await runOverdueReminders();

    expect(count).toBe(1);
    expect(sendTaskReminderEmail).toHaveBeenCalledWith(expect.objectContaining({ isOverdue: true }));
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "OVERDUE", userId: "u_a", link: "p1" }),
      })
    );
  });

  it("excludes COMPLETED and DELAYED tasks from overdue checks", async () => {
    await runOverdueReminders();

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { notIn: ["COMPLETED", "DELAYED"] } }),
      })
    );
  });
});

describe("startReminderJobs", () => {
  it("schedules both the due-soon and overdue cron jobs", () => {
    startReminderJobs();

    expect(cron.schedule).toHaveBeenCalledTimes(2);
    expect(cron.schedule).toHaveBeenCalledWith("0 8 * * *", expect.any(Function), undefined);
    expect(cron.schedule).toHaveBeenCalledWith("0 9 * * *", expect.any(Function), undefined);
  });
});
