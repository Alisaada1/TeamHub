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

const app = express();

import { ALLOWED_ORIGINS } from "./config/env.js";

app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: "1mb" }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

app.use(resolveClerkUser);

app.use("/api/auth", authRoutes);

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

app.use(notFound);
app.use(errorHandler);

export default app;
