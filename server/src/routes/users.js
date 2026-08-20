import { Router } from "express";
import { listUsers, getUser, getCurrentUser, updateCurrentUser, deleteAccount } from "../controllers/users.js";

const router = Router();

router.get("/", listUsers);
router.get("/me", getCurrentUser);
router.put("/me", updateCurrentUser);
router.delete("/me", deleteAccount);
router.get("/:id", getUser);

export default router;
