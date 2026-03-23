const express = require('express');
const authRouter = express.Router();

const {
    registerUser,
    loginUser,
    startGoogleAuth,
    googleAuthCallback,
    refreshSession,
    logoutUser,
    logoutAllUserSessions,
    getCurrentUser
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');


authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
authRouter.get('/google/start', startGoogleAuth);
authRouter.get('/google/callback', googleAuthCallback);
authRouter.post('/refresh', refreshSession);
authRouter.post('/logout', logoutUser);
authRouter.get('/me', protect, getCurrentUser);
authRouter.post('/logout-all', protect, logoutAllUserSessions);

module.exports = authRouter;
