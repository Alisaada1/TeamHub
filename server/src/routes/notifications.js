import { Router } from "express";
import {
  listNotifications, markNotificationRead, markAllNotificationsRead,
  getNotificationPreferences, updateNotificationPreferences,
} from "../controllers/notifications.js";

const router = Router();

router.get("/", listNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.get("/preferences", getNotificationPreferences);
router.put("/preferences", updateNotificationPreferences);

export default router;
