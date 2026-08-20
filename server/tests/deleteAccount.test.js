import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../src/services/users.js", () => ({
  getUser: vi.fn(),
  deleteUser: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../src/config/clerk.js", () => ({
  default: { users: { deleteUser: vi.fn() } },
}));

vi.mock("../src/services/activity.js", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import { deleteAccount } from "../src/controllers/users.js";
import * as userService from "../src/services/users.js";
import clerk from "../src/config/clerk.js";

function makeRes() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  userService.getUser.mockResolvedValue({ id: "u1", name: "Leaver", clerkId: "ck_1" });
  clerk.users.deleteUser.mockResolvedValue({});
});

describe("deleteAccount", () => {
  it("deletes the Clerk identity first, then the database user", async () => {
    const req = { userId: "u1" };
    const res = makeRes();
    const next = vi.fn();

    await deleteAccount(req, res, next);

    expect(clerk.users.deleteUser).toHaveBeenCalledWith("ck_1");
    expect(userService.deleteUser).toHaveBeenCalledWith("u1");
    expect(res.status).not.toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: null, error: null });
  });

  it("tolerates a Clerk 404 (already deleted) and still removes the database user", async () => {
    clerk.users.deleteUser.mockRejectedValue({ status: 404 });
    const req = { userId: "u1" };
    const res = makeRes();
    const next = vi.fn();

    await deleteAccount(req, res, next);

    expect(userService.deleteUser).toHaveBeenCalledWith("u1");
    expect(res.json).toHaveBeenCalledWith({ success: true, data: null, error: null });
  });

  it("aborts with 502 when Clerk deletion fails, leaving the database user intact", async () => {
    clerk.users.deleteUser.mockRejectedValue({ status: 500, message: "Clerk unavailable" });
    const req = { userId: "u1" };
    const res = makeRes();
    const next = vi.fn();

    await deleteAccount(req, res, next);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(userService.deleteUser).not.toHaveBeenCalled();
  });

  it("skips Clerk when the user has no clerkId but still deletes the database user", async () => {
    userService.getUser.mockResolvedValue({ id: "u1", name: "Leaver", clerkId: null });
    const req = { userId: "u1" };
    const res = makeRes();
    const next = vi.fn();

    await deleteAccount(req, res, next);

    expect(clerk.users.deleteUser).not.toHaveBeenCalled();
    expect(userService.deleteUser).toHaveBeenCalledWith("u1");
  });

  it("returns 404 when the user does not exist", async () => {
    userService.getUser.mockResolvedValue(null);
    const req = { userId: "u_missing" };
    const res = makeRes();
    const next = vi.fn();

    await deleteAccount(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(clerk.users.deleteUser).not.toHaveBeenCalled();
    expect(userService.deleteUser).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    const req = { userId: undefined };
    const res = makeRes();
    const next = vi.fn();

    await deleteAccount(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
