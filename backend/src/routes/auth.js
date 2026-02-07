const express = require("express");
const router = express.Router();
const passport = require("../config/passport");

// GET /api/auth/google - Initiate Google OAuth
router.get(
  "/google",
  (req, res, next) => {
    // Check if OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({ 
        error: "OAuth not configured",
        message: "Google OAuth credentials are not set. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file."
      });
    }
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })(req, res, next);
  }
);

// GET /api/auth/google/callback - Google OAuth callback
router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", {
      failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=auth_failed`,
    })(req, res, next);
  },
  (req, res) => {
    // Successful authentication
    res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/callback?success=true`
    );
  }
);

// GET /api/auth/me - Get current user
router.get("/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    // Don't send sensitive data
    const { id, username, email, display_name, avatar_url } = req.user;
    res.json({
      id,
      username,
      email,
      displayName: display_name,
      avatarUrl: avatar_url,
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// POST /api/auth/logout - Logout
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

module.exports = router;

