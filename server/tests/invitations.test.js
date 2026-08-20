import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../src/services/email.js", () => ({
  sendNotificationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/config/prisma.js", () => {
  const prismaMock = {
    invitation: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    member: { findUnique: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    notification: { create: vi.fn().mockResolvedValue({}), findFirst: vi.fn().mockResolvedValue(null) },
    notificationPreference: { findUnique: vi.fn().mockResolvedValue(null) },
  };
  return { default: prismaMock };
});

import prisma from "../src/config/prisma.js";
import { cancelInvitation } from "../src/services/invitations.js";

const pendingInvite = {
  id: "inv1",
  teamId: "team1",
  email: "guest@example.com",
  role: "MEMBER",
  status: "PENDING",
  invitedById: "u_inviter",
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.invitation.findUnique.mockResolvedValue(pendingInvite);
  prisma.invitation.delete.mockResolvedValue({});
});

describe("cancelInvitation", () => {
  it("allows the original inviter to cancel", async () => {
    const result = await cancelInvitation("inv1", "u_inviter");
    expect(prisma.invitation.delete).toHaveBeenCalledWith({ where: { id: "inv1" } });
    expect(result).toEqual({ success: true });
  });

  it("allows a team MANAGER to cancel someone else's invitation", async () => {
    prisma.member.findUnique.mockResolvedValue({ userId: "u_manager", teamId: "team1", role: "MANAGER" });
    await expect(cancelInvitation("inv1", "u_manager")).resolves.toEqual({ success: true });
    expect(prisma.invitation.delete).toHaveBeenCalled();
  });

  it("allows a team SUPERVISOR to cancel someone else's invitation", async () => {
    prisma.member.findUnique.mockResolvedValue({ userId: "u_super", teamId: "team1", role: "SUPERVISOR" });
    await expect(cancelInvitation("inv1", "u_super")).resolves.toEqual({ success: true });
    expect(prisma.invitation.delete).toHaveBeenCalled();
  });

  it("rejects a MEMBER who is not the inviter", async () => {
    prisma.member.findUnique.mockResolvedValue({ userId: "u_member", teamId: "team1", role: "MEMBER" });
    await expect(cancelInvitation("inv1", "u_member")).rejects.toThrow("Unauthorized");
    expect(prisma.invitation.delete).not.toHaveBeenCalled();
  });

  it("rejects a user who is not a team member", async () => {
    prisma.member.findUnique.mockResolvedValue(null);
    await expect(cancelInvitation("inv1", "u_outsider")).rejects.toThrow("Unauthorized");
    expect(prisma.invitation.delete).not.toHaveBeenCalled();
  });

  it("rejects cancelling an invitation that is no longer pending", async () => {
    prisma.invitation.findUnique.mockResolvedValue({ ...pendingInvite, status: "ACCEPTED" });
    await expect(cancelInvitation("inv1", "u_inviter")).rejects.toThrow("Invitation is no longer pending");
    expect(prisma.invitation.delete).not.toHaveBeenCalled();
  });

  it("rejects cancelling a missing invitation", async () => {
    prisma.invitation.findUnique.mockResolvedValue(null);
    await expect(cancelInvitation("inv1", "u_inviter")).rejects.toThrow("Invitation not found");
  });
});
