import express from "express";
const authRouter = express.Router();

import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerification,
  startGoogleAuth,
  googleAuthCallback,
  verifyGoogleMerge,
  refreshSession,
  logoutUser,
  logoutAllUserSessions,
  getCurrentUser,
  setPassword,
  sendOneTimePassword,
  deleteAccount,
  requestDeleteAccount,
  confirmDeleteAccount,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.get("/verify-email", verifyEmail);
authRouter.post("/resend-verification", resendVerification);
authRouter.get("/google/start", startGoogleAuth);
authRouter.get("/google/callback", googleAuthCallback);
authRouter.get("/verify-merge", verifyGoogleMerge);
authRouter.post("/refresh", refreshSession);
authRouter.post("/logout", logoutUser);
authRouter.get("/me", protect, getCurrentUser);
authRouter.post("/logout-all", protect, logoutAllUserSessions);
authRouter.post("/set-password", protect, setPassword);
authRouter.post("/send-one-time-password", protect, sendOneTimePassword);
authRouter.delete("/account", protect, deleteAccount);
authRouter.post("/account/request-delete", protect, requestDeleteAccount);
authRouter.get("/account/confirm-delete", confirmDeleteAccount);

export default authRouter;
