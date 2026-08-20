import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../src/config/prisma.js", () => {
  const prismaMock = {
    member: { findUnique: vi.fn(), findMany: vi.fn() },
    project: { findMany: vi.fn() },
    task: { groupBy: vi.fn() },
  };
  return { default: prismaMock };
});

import prisma from "../src/config/prisma.js";
import { listProjects } from "../src/services/projects.js";

beforeEach(() => {
  vi.clearAllMocks();
  prisma.task.groupBy.mockResolvedValue([]);
});

describe("listProjects", () => {
  it("returns [] when the user is not a member of the requested team (IDOR)", async () => {
    prisma.member.findUnique.mockResolvedValue(null);
    const result = await listProjects("u_outsider", "team_secret");
    expect(result).toEqual([]);
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when no userId is present", async () => {
    const result = await listProjects(null, "team1");
    expect(result).toEqual([]);
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  it("returns projects for a team the user belongs to", async () => {
    prisma.member.findUnique.mockResolvedValue({ userId: "u1", teamId: "team1", role: "MEMBER" });
    prisma.project.findMany.mockResolvedValue([{ id: "p1", teamId: "team1" }]);
    const result = await listProjects("u1", "team1");
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teamId: "team1", archived: false } })
    );
    expect(result).toHaveLength(1);
    expect(result[0]._count).toEqual({ tasks: 0, completedTasks: 0 });
  });

  it("scopes to the user's own teams when no teamId is given", async () => {
    prisma.member.findMany.mockResolvedValue([{ teamId: "t1" }, { teamId: "t2" }]);
    prisma.project.findMany.mockResolvedValue([{ id: "p1", teamId: "t1" }]);
    const result = await listProjects("u1", null);
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teamId: { in: ["t1", "t2"] }, archived: false } })
    );
    expect(result).toHaveLength(1);
  });

  it("returns [] when the user belongs to no teams", async () => {
    prisma.member.findMany.mockResolvedValue([]);
    const result = await listProjects("u1", null);
    expect(result).toEqual([]);
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });
});
