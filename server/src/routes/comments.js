import { Router } from "express";
import {
  listTaskComments, addTaskComment, togglePinComment, updateComment, deleteComment,
  getPinnedComments, toggleTaskComments, getDashboardPinnedComments,
} from "../controllers/comments.js";
import { requireTaskAccessByTaskId, requireCommentAccess } from "../middleware/access.js";
import { validate, required } from "../middleware/validate.js";

const router = Router();

router.get("/tasks/:taskId/comments", requireTaskAccessByTaskId(), listTaskComments);
router.post("/tasks/:taskId/comments", requireTaskAccessByTaskId(), validate({ body: [required] }), addTaskComment);
router.patch("/comments/:commentId/pin", requireCommentAccess("MANAGER", "SUPERVISOR"), togglePinComment);
router.put("/comments/:commentId", requireCommentAccess(), validate({ body: [required] }), updateComment);
router.delete("/comments/:commentId", requireCommentAccess(), deleteComment);
router.get("/tasks/:taskId/comments/pinned", requireTaskAccessByTaskId(), getPinnedComments);
router.patch("/tasks/:taskId/comments-toggle", requireTaskAccessByTaskId("MANAGER"), toggleTaskComments);
router.get("/dashboard/pinned-comments", getDashboardPinnedComments);

export default router;
