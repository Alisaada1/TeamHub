import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { resolveClerkUser, requireUser } from "./middleware/clerkAuth.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import teamRoutes from "./routes/teams.js";
import memberRoutes from "./routes/members.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import commentRoutes from "./routes/comments.js";
import notificationRoutes from "./routes/notifications.js";
import presenceRoutes from "./routes/presence.js";
import invitationRoutes from "./routes/invitations.js";
import dashboardRoutes from "./routes/dashboard.js";
import activityRoutes from "./routes/activity.js";

import { ALLOWED_ORIGINS } from "./config/env.js";
import prisma from "./config/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../../client/dist");
const indexHtml = path.join(distDir, "index.html");

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        upgradeInsecureRequests: [],
        scriptSrc: ["'self'", "blob:", "https://*.clerk.com", "https://*.clerk.accounts.dev", "https://*.clerk.app"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://img.clerk.com"],
        connectSrc: [
          "'self'",
          "https://api.clerk.com",
          "https://*.clerk.com",
          "https://*.clerk.accounts.dev",
          "https://*.clerk.app",
          "https://img.clerk.com",
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
        ],
        frameSrc: ["'self'", "https://*.clerk.com", "https://*.clerk.accounts.dev", "https://*.clerk.app"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
      },
    },
  })
);
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: "1mb" }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

app.use(resolveClerkUser);

app.use("/api/auth", authRoutes);

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use("/api", requireUser);

app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api", memberRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/presence", presenceRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/activity", activityRoutes);

app.use(express.static(distDir));

app.get("*", (req, res, next) => {
  const p = req.path;
  if (p.startsWith("/api")) return next();
  if (path.extname(p)) return next();
  if (!fs.existsSync(indexHtml)) return next();
  res.sendFile(indexHtml);
});

app.use(notFound);
app.use(errorHandler);

export default app;
