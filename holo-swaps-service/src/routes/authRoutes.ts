import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  me,
  verifyEmail,
  forgotPassword,
  resetPassword,
  checkUsernameAvailability,
  checkEmailAvailability,
  resendVerificationEmail,
  deleteAccount,
} from "@/controllers/authController";
import {
  setup2FA,
  confirm2FA,
  disable2FA,
  verifyTwoFactor,
} from "@/controllers/twoFactorController";
import { authenticate } from "@/middleware/auth";

const router = Router();

// Public routes
router.get("/check-username", checkUsernameAvailability);
router.get("/check-email", checkEmailAvailability);
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/me", authenticate, me);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authenticate, resendVerificationEmail);
router.delete("/delete-account", authenticate, deleteAccount);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// 2FA — setup/disable require a valid session; verify is public (second step of login)
router.post("/2fa/setup", authenticate, setup2FA);
router.post("/2fa/confirm", authenticate, confirm2FA);
router.delete("/2fa", authenticate, disable2FA);
router.post("/2fa/verify", verifyTwoFactor);

export default router;
