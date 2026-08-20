import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../src/config/prisma.js", () => {
  const prismaMock = {
    task: { update: vi.fn() },
  };
  return { default: prismaMock };
});

import prisma from "../src/config/prisma.js";
import { updateTask, updateTaskStatus } from "../src/services/tasks.js";

const taskInclude = {
  assignee: true,
  creator: true,
  _count: { select: { comments: true } },
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.task.update.mockImplementation(({ data }) => Promise.resolve({ id: "t1", ...data }));
});

describe("completedAt lifecycle (services/tasks.js)", () => {
  it("sets completedAt when updateTaskStatus moves a task to COMPLETED", async () => {
    const before = Date.now();
    await updateTaskStatus("t1", "COMPLETED");
    const { status, completedAt } = prisma.task.update.mock.calls[0][0].data;
    expect(status).toBe("COMPLETED");
    expect(completedAt).toBeInstanceOf(Date);
    expect(completedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "COMPLETED", completedAt: expect.any(Date), lastReminderSentAt: null },
      include: taskInclude,
    });
  });

  it("clears completedAt when updateTaskStatus leaves COMPLETED", async () => {
    await updateTaskStatus("t1", "IN_PROGRESS");
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "IN_PROGRESS", completedAt: null, lastReminderSentAt: null },
      include: taskInclude,
    });
  });

  it("sets completedAt when updateTask includes status COMPLETED", async () => {
    await updateTask("t1", { title: "x", status: "COMPLETED" });
    const payload = prisma.task.update.mock.calls[0][0].data;
    expect(payload.status).toBe("COMPLETED");
    expect(payload.completedAt).toBeInstanceOf(Date);
  });

  it("clears completedAt when updateTask includes a non-completed status", async () => {
    await updateTask("t1", { title: "x", status: "PENDING" });
    const payload = prisma.task.update.mock.calls[0][0].data;
    expect(payload.completedAt).toBeNull();
  });

  it("does not touch completedAt when updateTask has no status", async () => {
    await updateTask("t1", { title: "Renamed" });
    const payload = prisma.task.update.mock.calls[0][0].data;
    expect(payload).toEqual({ title: "Renamed" });
    expect("completedAt" in payload).toBe(false);
  });

  it("passes through non-status fields alongside completedAt", async () => {
    await updateTask("t1", { priority: "HIGH", status: "DELAYED" });
    const payload = prisma.task.update.mock.calls[0][0].data;
    expect(payload.priority).toBe("HIGH");
    expect(payload.completedAt).toBeNull();
  });
});
