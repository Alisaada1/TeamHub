import "dotenv/config";

export const PORT = process.env.PORT || 3000;
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
export const CRON_TIMEZONE = process.env.CRON_TIMEZONE || undefined;
export const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://localhost:3000"];
