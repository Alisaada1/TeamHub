import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../src/services/tasks.js", () => ({
  listTasks: vi.fn(),
  listMyTasks: vi.fn(),
  listTeamTasks: vi.fn(),
  getTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  deleteTask: vi.fn(),
  getKanbanTasks: vi.fn(),
  getCalendarTasks: vi.fn(),
  toggleCommentsDisabled: vi.fn(),
}));

vi.mock("../src/services/comments.js", () => ({
  listTaskComments: vi.fn(),
  addTaskComment: vi.fn(),
  togglePinComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  getPinnedComments: vi.fn(),
  getPinnedCommentsForUser: vi.fn(),
  toggleTaskComments: vi.fn(),
}));

vi.mock("../src/services/activity.js", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/services/email.js", () => ({
  sendNotificationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/config/prisma.js", () => {
  const prismaMock = {
    task: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn() },
    project: { findUnique: vi.fn() },
    member: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    notification: { create: vi.fn().mockResolvedValue({}) },
    notificationPreference: { findUnique: vi.fn().mockResolvedValue(null) },
  };
  return { default: prismaMock };
});

import prisma from "../src/config/prisma.js";
import { sendNotificationEmail } from "../src/services/email.js";
import * as commentService from "../src/services/comments.js";
import * as taskService from "../src/services/tasks.js";
import { createTask, updateTask, updateTaskStatus } from "../src/controllers/tasks.js";
import { addTaskComment } from "../src/controllers/comments.js";

function makeRes() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res;
}

const baseTask = {
  id: "t1",
  title: "Task",
  description: null,
  status: "PENDING",
  priority: "MEDIUM",
  category: null,
  dueDate: null,
  assigneeId: "u_other",
  creatorId: "u_creator",
  commentsDisabled: false,
  projectId: "p1",
  assignee: { id: "u_other", name: "Other", email: "other@example.com" },
  creator: { id: "u_creator", name: "Creator", email: "creator@example.com" },
  project: { id: "p1", teamId: "team1" },
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.task.findUnique.mockReset().mockResolvedValue({ project: { teamId: "team1" } });
  prisma.user.findUnique.mockReset().mockResolvedValue({ name: "User", email: "user@example.com" });
  prisma.notificationPreference.findUnique.mockReset().mockResolvedValue(null);
  prisma.notification.create.mockReset().mockResolvedValue({});
  taskService.getTask.mockResolvedValue(baseTask);
  taskService.createTask.mockResolvedValue({ ...baseTask, id: "t9" });
  taskService.updateTask.mockImplementation((id, data) => Promise.resolve({ ...baseTask, ...data }));
  taskService.updateTaskStatus.mockImplementation((id, status) => Promise.resolve({ ...baseTask, status }));
  commentService.addTaskComment.mockResolvedValue({ id: "c1", body: "hi", authorId: "u_member" });
});

describe("createTask assignment", () => {
  it("sends a TASK_ASSIGNED bell notification and email when assigned to someone else", async () => {
    taskService.createTask.mockResolvedValue({ ...baseTask, id: "t9", assigneeId: "u_other", creatorId: "u_manager" });
    prisma.user.findUnique
      .mockResolvedValueOnce({ email: "other@example.com", name: "Other" })
      .mockResolvedValueOnce({ name: "Manager" });
    const req = { userId: "u_manager", userRole: "MANAGER", params: { projectId: "p1" }, body: { title: "T", assigneeId: "u_other" } };
    const res = makeRes();
    const next = vi.fn();

    await createTask(req, res, next);

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "TASK_ASSIGNED",
          userId: "u_other",
          entityId: "t9",
          link: "p1",
          teamId: "team1",
        }),
      })
    );
    expect(sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ recipientEmail: "other@example.com" })
    );
  });

  it("does not notify when the creator assigns the task to themselves", async () => {
    taskService.createTask.mockResolvedValue({ ...baseTask, id: "t9", assigneeId: "u_manager", creatorId: "u_manager" });
    const req = { userId: "u_manager", userRole: "MANAGER", params: { projectId: "p1" }, body: { title: "T", assigneeId: "u_manager" } };
    const res = makeRes();
    const next = vi.fn();

    await createTask(req, res, next);

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it("keeps the bell notification but skips the email when emailNotifications is disabled", async () => {
    taskService.createTask.mockResolvedValue({ ...baseTask, id: "t9", assigneeId: "u_other", creatorId: "u_manager" });
    prisma.notificationPreference.findUnique.mockResolvedValue({ emailNotifications: false });
    prisma.user.findUnique
      .mockResolvedValueOnce({ email: "other@example.com", name: "Other" })
      .mockResolvedValueOnce({ name: "Manager" });
    const req = { userId: "u_manager", userRole: "MANAGER", params: { projectId: "p1" }, body: { title: "T", assigneeId: "u_other" } };
    const res = makeRes();
    const next = vi.fn();

    await createTask(req, res, next);

    expect(prisma.notification.create).toHaveBeenCalled();
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });
});

describe("updateTask status change", () => {
  it("sends STATUS_CHANGED bell + email to assignee and creator and resets reminder dedup", async () => {
    taskService.updateTask.mockResolvedValue({ ...baseTask, status: "IN_PROGRESS" });
    prisma.user.findUnique.mockResolvedValue({ name: "Manager" });
    const req = {
      userId: "u_manager",
      userRole: "MANAGER",
      params: { id: "t1" },
      body: { status: "IN_PROGRESS" },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(taskService.updateTask).toHaveBeenCalledWith("t1", { status: "IN_PROGRESS", lastReminderSentAt: null });
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "STATUS_CHANGED", userId: "u_other", link: "p1", teamId: "team1" }),
      })
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "STATUS_CHANGED", userId: "u_creator", link: "p1", teamId: "team1" }),
      })
    );
    expect(sendNotificationEmail).toHaveBeenCalledTimes(2);
  });

  it("sends no status notification when only non-status fields change", async () => {
    taskService.updateTask.mockResolvedValue({ ...baseTask, title: "New" });
    const req = { userId: "u_manager", userRole: "MANAGER", params: { id: "t1" }, body: { title: "New" } };
    const res = makeRes();
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(taskService.updateTask).toHaveBeenCalledWith("t1", { title: "New" });
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it("keeps bell notifications but skips emails when statusChangeNotifications is disabled", async () => {
    taskService.updateTask.mockResolvedValue({ ...baseTask, status: "COMPLETED" });
    prisma.notificationPreference.findUnique.mockResolvedValue({ statusChangeNotifications: false });
    prisma.user.findUnique.mockResolvedValue({ name: "Manager" });
    const req = { userId: "u_manager", userRole: "MANAGER", params: { id: "t1" }, body: { status: "COMPLETED" } };
    const res = makeRes();
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });
});

describe("updateTaskStatus (PATCH /tasks/:id/status)", () => {
  it("sends STATUS_CHANGED bell + email via the status endpoint", async () => {
    prisma.user.findUnique.mockResolvedValue({ name: "Manager" });
    const req = { userId: "u_manager", userRole: "MANAGER", params: { id: "t1" }, body: { status: "COMPLETED" } };
    const res = makeRes();
    const next = vi.fn();

    await updateTaskStatus(req, res, next);

    expect(taskService.updateTaskStatus).toHaveBeenCalledWith("t1", "COMPLETED");
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "STATUS_CHANGED", userId: "u_other", link: "p1" }),
      })
    );
    expect(sendNotificationEmail).toHaveBeenCalledTimes(2);
  });
});

describe("unassignment", () => {
  it("stores the real task id (not the title) as entityId on TASK_UNASSIGNED", async () => {
    taskService.updateTask.mockResolvedValue({ ...baseTask, assigneeId: null });
    prisma.user.findUnique
      .mockResolvedValueOnce({ email: "other@example.com", name: "Other" })
      .mockResolvedValueOnce({ name: "Manager" });
    const req = { userId: "u_manager", userRole: "MANAGER", params: { id: "t1" }, body: { assigneeId: null } };
    const res = makeRes();
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "TASK_UNASSIGNED",
          entityId: "t1",
          userId: "u_other",
        }),
      })
    );
    expect(sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ recipientEmail: "other@example.com" })
    );
  });
});

describe("comments", () => {
  it("notifies the assignee with link=projectId and emails with ctaLink=projectId", async () => {
    prisma.task.findUnique
      .mockResolvedValueOnce({ commentsDisabled: false })
      .mockResolvedValueOnce({ assigneeId: "u_other", title: "Task", projectId: "p1", project: { teamId: "team1" } });
    prisma.user.findUnique
      .mockResolvedValueOnce({ name: "Member", email: "m@example.com" })
      .mockResolvedValueOnce({ email: "other@example.com", name: "Other" });
    const req = { userId: "u_member", params: { taskId: "t1" }, body: { body: "hi" } };
    const res = makeRes();
    const next = vi.fn();

    await addTaskComment(req, res, next);

    expect(commentService.addTaskComment).toHaveBeenCalledWith("t1", { body: "hi", authorId: "u_member" });
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "COMMENT_ADDED",
          userId: "u_other",
          entityId: "t1",
          link: "p1",
          teamId: "team1",
        }),
      })
    );
    expect(sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ recipientEmail: "other@example.com", ctaLink: "p1" })
    );
  });

  it("does not notify when the comment author is the assignee", async () => {
    prisma.task.findUnique
      .mockResolvedValueOnce({ commentsDisabled: false })
      .mockResolvedValueOnce({ assigneeId: "u_member", title: "Task", projectId: "p1", project: { teamId: "team1" } });
    const req = { userId: "u_member", params: { taskId: "t1" }, body: { body: "hi" } };
    const res = makeRes();
    const next = vi.fn();

    await addTaskComment(req, res, next);

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it("keeps the bell notification but skips the email when commentNotifications is disabled", async () => {
    prisma.task.findUnique
      .mockResolvedValueOnce({ commentsDisabled: false })
      .mockResolvedValueOnce({ assigneeId: "u_other", title: "Task", projectId: "p1", project: { teamId: "team1" } });
    prisma.user.findUnique
      .mockResolvedValueOnce({ name: "Member", email: "m@example.com" })
      .mockResolvedValueOnce({ email: "other@example.com", name: "Other" });
    prisma.notificationPreference.findUnique.mockResolvedValue({ commentNotifications: false });
    const req = { userId: "u_member", params: { taskId: "t1" }, body: { body: "hi" } };
    const res = makeRes();
    const next = vi.fn();

    await addTaskComment(req, res, next);

    expect(prisma.notification.create).toHaveBeenCalled();
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });
});
