import { Router } from "express";
import { signIn, signUp } from "../controllers/auth.js";
import { validate, required, isEmail } from "../middleware/validate.js";

const router = Router();

router.post("/sign-in", validate({ email: [required, isEmail] }), signIn);
router.post("/sign-up", validate({ name: [required], email: [required, isEmail] }), signUp);

export default router;
