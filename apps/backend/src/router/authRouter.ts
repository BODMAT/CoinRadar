import express from "express";
const authRouter = express.Router();

import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerification,
  startGoogleAuth,
  googleAuthCallback,
  refreshSession,
  logoutUser,
  logoutAllUserSessions,
  getCurrentUser,
  setPassword,
  deleteAccount,
  updateProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.get("/verify-email", verifyEmail);
authRouter.post("/resend-verification", resendVerification);
authRouter.get("/google/start", startGoogleAuth);
authRouter.get("/google/callback", googleAuthCallback);
authRouter.post("/refresh", refreshSession);
authRouter.post("/logout", logoutUser);
authRouter.get("/me", protect, getCurrentUser);
authRouter.post("/logout-all", protect, logoutAllUserSessions);
authRouter.post("/set-password", protect, setPassword);
authRouter.patch("/me", protect, updateProfile);
authRouter.delete("/account", protect, deleteAccount);

export default authRouter;
