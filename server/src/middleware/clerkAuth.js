import { verifyToken } from "@clerk/backend";
import { CLERK_SECRET_KEY } from "../config/env.js";
import prisma from "../config/prisma.js";
import clerk from "../config/clerk.js";

const TRANSIENT_CODES = new Set([
  "P1001",
  "P1002",
  "P1017",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

function isTransientError(err) {
  if (!err) return false;
  if (TRANSIENT_CODES.has(err.code)) return true;
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("can't reach database") ||
    msg.includes("timed out") ||
    msg.includes("connection terminated") ||
    msg.includes("connection reset") ||
    msg.includes("connection refused") ||
    msg.includes("socket hang up") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused")
  );
}

async function withRetry(fn, attempts = 6, delayMs = 500) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientError(err) || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

async function provisionUser(clerkUserId) {
  let user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
  if (user) return user;

  const clerkUser = await clerk.users.getUser(clerkUserId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const name = clerkUser.firstName
    ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
    : clerkUser.username || email?.split("@")[0] || "User";

  const safeName = name || "User";
  const safeEmail = email ? email.toLowerCase() : `${clerkUserId}@teamhub.dev`;

  const byEmail = email
    ? await prisma.user.findUnique({ where: { email: safeEmail } })
    : null;

  if (byEmail) {
    user = await prisma.user.update({
      where: { id: byEmail.id },
      data: { clerkId: clerkUserId, name: safeName, imageUrl: clerkUser.imageUrl || null },
    });
  } else {
    user = await prisma.user.create({
      data: { clerkId: clerkUserId, name: safeName, email: safeEmail, imageUrl: clerkUser.imageUrl || null },
    });
  }

  return user;
}

export async function resolveClerkUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);
  let clerkUserId;
  try {
    const payload = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    clerkUserId = payload.sub;
  } catch {
    return next();
  }
  if (!clerkUserId) return next();

  try {
    const user = await withRetry(() => provisionUser(clerkUserId));
    req.userId = user.id;
    req.user = user;
  } catch (err) {
    console.error("User provisioning error:", err.message);
    return res.status(503).json({
      success: false,
      data: null,
      error: "Service temporarily unavailable. Please try again in a moment.",
    });
  }

  next();
}

export function requireUser(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      data: null,
      error: "Authentication required.",
    });
  }
  next();
}
