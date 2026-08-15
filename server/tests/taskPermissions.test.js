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

vi.mock("../src/services/activity.js", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/services/email.js", () => ({
  sendNotificationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/config/prisma.js", () => {
  const prismaMock = {
    task: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    project: { findUnique: vi.fn() },
    member: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    notification: { create: vi.fn().mockResolvedValue({}), deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    notificationPreference: { findUnique: vi.fn().mockResolvedValue(null) },
  };
  return { default: prismaMock };
});

import * as taskService from "../src/services/tasks.js";
import prisma from "../src/config/prisma.js";
import {
  createTask,
  updateTask,
  updateTaskStatus,
  listMyTasks,
} from "../src/controllers/tasks.js";

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
  assignee: { id: "u_other", name: "Other" },
  creator: { id: "u_creator", name: "Creator" },
  project: { id: "p1", teamId: "team1" },
};

beforeEach(() => {
  vi.clearAllMocks();
  taskService.getTask.mockResolvedValue(baseTask);
  taskService.updateTask.mockImplementation((id, data) => Promise.resolve({ ...baseTask, ...data }));
  taskService.updateTaskStatus.mockImplementation((id, status) => Promise.resolve({ ...baseTask, status }));
  prisma.task.findUnique.mockResolvedValue({ project: { teamId: "team1" } });
  prisma.user.findUnique.mockResolvedValue({ name: "User", email: "user@example.com" });
});

describe("createTask (MEMBER)", () => {
  it("forces assigneeId to the creating member", async () => {
    taskService.createTask.mockResolvedValue({ ...baseTask, id: "t9", assigneeId: "u_member", creatorId: "u_member" });
    const req = {
      userId: "u_member",
      userRole: "MEMBER",
      params: { projectId: "p1" },
      body: { title: "My task", assigneeId: "u_other" },
    };
    const res = makeRes();
    const next = vi.fn();

    await createTask(req, res, next);

    expect(taskService.createTask).toHaveBeenCalledWith("p1", {
      title: "My task",
      assigneeId: "u_member",
      creatorId: "u_member",
    });
    expect(res.json).toHaveBeenCalled();
  });
});

describe("updateTask (PUT /tasks/:id)", () => {
  it("rejects MEMBER editing a task they do not own", async () => {
    const req = {
      userId: "u_member",
      userRole: "MEMBER",
      params: { id: "t1" },
      body: { title: "Hijack" },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(taskService.updateTask).not.toHaveBeenCalled();
  });

  it("rejects MEMBER owner reassigning their task to another member", async () => {
    taskService.getTask.mockResolvedValue({ ...baseTask, assigneeId: "u_member", creatorId: "u_member" });
    const req = {
      userId: "u_member",
      userRole: "MEMBER",
      params: { id: "t1" },
      body: { assigneeId: "u_other" },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(taskService.updateTask).not.toHaveBeenCalled();
  });

  it("allows MEMBER owner to edit non-assignment fields", async () => {
    taskService.getTask.mockResolvedValue({ ...baseTask, assigneeId: "u_member", creatorId: "u_member" });
    const req = {
      userId: "u_member",
      userRole: "MEMBER",
      params: { id: "t1" },
      body: { title: "Updated title", status: "IN_PROGRESS" },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(taskService.updateTask).toHaveBeenCalledWith("t1", { title: "Updated title", status: "IN_PROGRESS", lastReminderSentAt: null });
    expect(res.json).toHaveBeenCalled();
  });

  it("rejects MEMBER who created the task (but is not the assignee) from editing it", async () => {
    taskService.getTask.mockResolvedValue({ ...baseTask, assigneeId: "u_other", creatorId: "u_member" });
    const req = {
      userId: "u_member",
      userRole: "MEMBER",
      params: { id: "t1" },
      body: { title: "Edit as creator" },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(taskService.updateTask).not.toHaveBeenCalled();
  });

  it("allows MEMBER owner to unassign themselves", async () => {
    taskService.getTask.mockResolvedValue({ ...baseTask, assigneeId: "u_member", creatorId: "u_member" });
    const req = {
      userId: "u_member",
      userRole: "MEMBER",
      params: { id: "t1" },
      body: { assigneeId: null },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(taskService.updateTask).toHaveBeenCalledWith("t1", { assigneeId: null });
  });

  it("strips commentsDisabled for MEMBER (backdoor closed)", async () => {
    taskService.getTask.mockResolvedValue({ ...baseTask, assigneeId: "u_member", creatorId: "u_member" });
    const req = {
      userId: "u_member",
      userRole: "MEMBER",
      params: { id: "t1" },
      body: { title: "x", commentsDisabled: true },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(taskService.updateTask).toHaveBeenCalledWith("t1", { title: "x" });
  });

  it("strips commentsDisabled for SUPERVISOR (toggle is MANAGER-only)", async () => {
    const req = {
      userId: "u_super",
      userRole: "SUPERVISOR",
      params: { id: "t1" },
      body: { title: "x", commentsDisabled: true },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(taskService.updateTask).toHaveBeenCalledWith("t1", { title: "x" });
  });

  it("honors commentsDisabled for MANAGER", async () => {
    const req = {
      userId: "u_manager",
      userRole: "MANAGER",
      params: { id: "t1" },
      body: { title: "x", commentsDisabled: true },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTask(req, res, next);

    expect(taskService.updateTask).toHaveBeenCalledWith("t1", { title: "x", commentsDisabled: true });
  });
});

describe("updateTaskStatus (PATCH /tasks/:id/status)", () => {
  it("rejects MEMBER changing status of a task they do not own", async () => {
    const req = {
      userId: "u_member",
      userRole: "MEMBER",
      params: { id: "t1" },
      body: { status: "COMPLETED" },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTaskStatus(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(taskService.updateTaskStatus).not.toHaveBeenCalled();
  });

  it("allows MEMBER to change status of their own task", async () => {
    taskService.getTask.mockResolvedValue({ ...baseTask, assigneeId: "u_member" });
    const req = {
      userId: "u_member",
      userRole: "MEMBER",
      params: { id: "t1" },
      body: { status: "COMPLETED" },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTaskStatus(req, res, next);

    expect(taskService.updateTaskStatus).toHaveBeenCalledWith("t1", "COMPLETED");
    expect(res.json).toHaveBeenCalled();
  });

  it("rejects MEMBER who created the task (but is not the assignee) from changing status", async () => {
    taskService.getTask.mockResolvedValue({ ...baseTask, assigneeId: "u_other", creatorId: "u_member" });
    const req = {
      userId: "u_member",
      userRole: "MEMBER",
      params: { id: "t1" },
      body: { status: "COMPLETED" },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTaskStatus(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(taskService.updateTaskStatus).not.toHaveBeenCalled();
  });

  it("returns 404 when the task does not exist", async () => {
    taskService.getTask.mockResolvedValue(null);
    const req = {
      userId: "u_member",
      userRole: "MEMBER",
      params: { id: "missing" },
      body: { status: "COMPLETED" },
    };
    const res = makeRes();
    const next = vi.fn();

    await updateTaskStatus(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("listMyTasks (GET /tasks)", () => {
  it("requires teamId when scope=all", async () => {
    const req = { userId: "u_member", query: { scope: "all" } };
    const res = makeRes();
    const next = vi.fn();

    await listMyTasks(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects scope=all for non-members", async () => {
    prisma.member.findUnique.mockResolvedValue(null);
    const req = { userId: "u_member", query: { scope: "all", teamId: "team1" } };
    const res = makeRes();
    const next = vi.fn();

    await listMyTasks(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns all team tasks for a member when scope=all", async () => {
    prisma.member.findUnique.mockResolvedValue({ userId: "u_member", teamId: "team1", role: "MEMBER" });
    taskService.listTeamTasks.mockResolvedValue([baseTask]);
    const req = { userId: "u_member", query: { scope: "all", teamId: "team1" } };
    const res = makeRes();
    const next = vi.fn();

    await listMyTasks(req, res, next);

    expect(taskService.listTeamTasks).toHaveBeenCalledWith("team1");
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [baseTask], error: null });
  });

  it("keeps assigned-to-me behavior without scope=all", async () => {
    taskService.listMyTasks.mockResolvedValue([baseTask]);
    const req = { userId: "u_member", query: { teamId: "team1" } };
    const res = makeRes();
    const next = vi.fn();

    await listMyTasks(req, res, next);

    expect(taskService.listMyTasks).toHaveBeenCalledWith("u_member", "team1");
    expect(res.json).toHaveBeenCalled();
  });
});
