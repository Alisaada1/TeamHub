import { createClerkClient } from "@clerk/backend";
import { CLERK_SECRET_KEY } from "./env.js";

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

export default clerk;
