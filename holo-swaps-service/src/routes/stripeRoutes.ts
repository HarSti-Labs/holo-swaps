import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import { setupCustomer, setupConnectAccount, verifyIdentity } from "@/controllers/stripeController";

const router = Router();

router.post("/setup-customer", authenticate, setupCustomer);
router.post("/connect", authenticate, setupConnectAccount);
router.post("/verify-identity", authenticate, verifyIdentity);

export default router;
