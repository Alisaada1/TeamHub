import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../src/config/prisma.js", () => {
  const prismaMock = {
    $transaction: vi.fn(),
  };
  return { default: prismaMock };
});

vi.mock("../src/services/members.js", () => ({
  handleMemberExit: vi.fn().mockResolvedValue({}),
}));

import { deleteUser } from "../src/services/users.js";
import prisma from "../src/config/prisma.js";
import { handleMemberExit } from "../src/services/members.js";

let tx;

beforeEach(() => {
  vi.clearAllMocks();
  tx = {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: "u1", name: "Leaver", clerkId: "ck_1" }),
      delete: vi.fn().mockResolvedValue({ id: "u1" }),
    },
    member: {
      findMany: vi.fn().mockResolvedValue([
        { teamId: "t1" },
        { teamId: "t2" },
      ]),
    },
    team: {
      findMany: vi.fn().mockResolvedValue([{ id: "t1" }, { id: "t3" }]),
      update: vi.fn().mockResolvedValue({}),
    },
    project: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    task: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    comment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    invitation: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
});

describe("deleteUser", () => {
  it("exits every membership and preserves shared projects, tasks and comments", async () => {
    await deleteUser("u1");

    expect(handleMemberExit).toHaveBeenCalledWith(tx, {
      teamId: "t1",
      userId: "u1",
      leaverName: "Leaver",
      reason: "deleted_account",
    });
    expect(handleMemberExit).toHaveBeenCalledWith(tx, {
      teamId: "t2",
      userId: "u1",
      leaverName: "Leaver",
      reason: "deleted_account",
    });

    expect(tx.project.updateMany).toHaveBeenCalledWith(
      { where: { creatorId: "u1" }, data: { creatorId: null } }
    );
    expect(tx.task.updateMany).toHaveBeenCalledWith(
      { where: { creatorId: "u1" }, data: { creatorId: null } }
    );
    expect(tx.task.updateMany).toHaveBeenCalledWith(
      { where: { assigneeId: "u1" }, data: { assigneeId: null } }
    );
    expect(tx.comment.updateMany).toHaveBeenCalledWith(
      { where: { authorId: "u1" }, data: { authorId: null } }
    );
    expect(tx.invitation.deleteMany).toHaveBeenCalledWith({ where: { invitedById: "u1" } });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("transfers a created-but-not-membered team to the oldest remaining member", async () => {
    tx.team.findMany.mockResolvedValue([{ id: "t3" }]);
    tx.member.findMany.mockResolvedValue([{ teamId: "t2" }]);
    tx.member.findMany.mockResolvedValueOnce([{ teamId: "t2" }]);
    tx.team.findMany.mockResolvedValueOnce([{ id: "t3" }]);
    tx.member.findMany.mockResolvedValueOnce([{ userId: "m9" }]);

    await deleteUser("u1");

    expect(tx.team.update).toHaveBeenCalledWith({
      where: { id: "t3" },
      data: { creatorId: "m9" },
    });
  });

  it("nulls the creator when an orphaned team has no remaining members", async () => {
    tx.team.findMany.mockResolvedValueOnce([{ id: "t3" }]);
    tx.member.findMany.mockResolvedValueOnce([]);

    await deleteUser("u1");

    expect(tx.team.update).toHaveBeenCalledWith({
      where: { id: "t3" },
      data: { creatorId: null },
    });
  });

  it("returns null and deletes nothing when the user does not exist", async () => {
    tx.user.findUnique.mockResolvedValue(null);

    const result = await deleteUser("u_missing");

    expect(result).toBeNull();
    expect(handleMemberExit).not.toHaveBeenCalled();
    expect(tx.user.delete).not.toHaveBeenCalled();
  });
});
