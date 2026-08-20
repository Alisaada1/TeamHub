import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import supertest from "supertest";
import app from "../src/app.js";
import * as presenceService from "../src/services/presence.js";

const prisma = new PrismaClient();
const request = supertest(app);

const testEmail = "test-presence@vitest.com";

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
});

describe("presence service", () => {
  let userId;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { name: "Presence Test", email: testEmail },
    });
    userId = user.id;
  });

  it("touches lastSeenAt", async () => {
    const before = new Date(Date.now() - 5 * 60 * 1000);
    await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: before } });
    await presenceService.touchLastSeen(userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user.lastSeenAt.getTime()).toBeGreaterThan(before.getTime());
  });

  it("includes recently active users as online", async () => {
    await presenceService.touchLastSeen(userId);
    const online = await presenceService.getOnlineUserIds();
    expect(online).toContain(userId);
  });

  it("excludes stale users", async () => {
    const stale = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: stale } });
    const online = await presenceService.getOnlineUserIds();
    expect(online).not.toContain(userId);
  });
});

describe("presence endpoints (protected)", () => {
  it("returns 401 without auth for heartbeat", async () => {
    const res = await request.post("/api/presence/heartbeat");
    expect(res.status).toBe(401);
  });

  it("returns 401 without auth for online list", async () => {
    const res = await request.get("/api/presence/online");
    expect(res.status).toBe(401);
  });
});
