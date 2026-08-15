import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import supertest from "supertest";
import app from "../src/app.js";

const prisma = new PrismaClient();
const request = supertest(app);

const testEmail = "test-auth@vitest.com";

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
});

describe("POST /api/auth/sign-up", () => {
  it("rejects missing name", async () => {
    const res = await request.post("/api/auth/sign-up").send({ email: testEmail });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name is required/i);
  });

  it("rejects invalid email", async () => {
    const res = await request.post("/api/auth/sign-up").send({ name: "Test", email: "bad-email" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid email/i);
  });

  it("creates a user", async () => {
    const res = await request.post("/api/auth/sign-up").send({ name: "Test User", email: testEmail });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testEmail);
  });

  it("rejects duplicate email", async () => {
    const res = await request.post("/api/auth/sign-up").send({ name: "Test User", email: testEmail });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/sign-in", () => {
  it("rejects missing email", async () => {
    const res = await request.post("/api/auth/sign-in").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email is required/i);
  });

  it("returns existing user", async () => {
    const res = await request.post("/api/auth/sign-in").send({ email: testEmail });
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testEmail);
  });
});

describe("GET /api/users/me (protected)", () => {
  it("returns 401 without auth", async () => {
    const res = await request.get("/api/users/me");
    expect(res.status).toBe(401);
  });
});
