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

export default authRouter;
