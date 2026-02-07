const express = require("express");
const router = express.Router();
const { getDB } = require("../db/init");

// Helper: compute gamification stats from raw DB row
function computeStats(user, totalWorkouts) {
  const totalPoints = user.points || 0;
  const level = Math.floor(totalPoints / 1000) + 1;
  const currentXP = totalPoints % 1000;
  const nextLevelXP = 1000;
  const ranks = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
  const rankIndex = Math.min(Math.floor((level - 1) / 5), ranks.length - 1);

  return {
    level,
    currentXP,
    nextLevelXP,
    totalPoints,
    streak: user.current_streak || 0,
    longestStreak: user.longest_streak || 0,
    totalWorkouts: totalWorkouts || 0,
    rank: ranks[rankIndex],
  };
}

// GET /api/user/stats — computed from SQLite
router.get("/stats", (_req, res) => {
  const db = getDB();
  const userId = 1; // single-user mode

  db.get(
    "SELECT points, current_streak, longest_streak, last_verified_at FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!user) {
        // Return defaults when user row doesn't exist yet
        return res.json({
          level: 1, currentXP: 0, nextLevelXP: 1000,
          totalPoints: 0, streak: 0, longestStreak: 0,
          totalWorkouts: 0, rank: "Bronze",
        });
      }

      db.get(
        "SELECT COUNT(*) as cnt FROM activity_log WHERE user_id = ? AND verified = 1",
        [userId],
        (_err2, row) => {
          res.json(computeStats(user, row ? row.cnt : 0));
        }
      );
    }
  );
});

// PUT /api/user/stats — no-op, returns current DB state
// (verification endpoint is the authoritative writer)
router.put("/stats", (_req, res) => {
  const db = getDB();
  db.get(
    "SELECT points, current_streak, longest_streak FROM users WHERE id = 1",
    (err, user) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(computeStats(user, 0));
    }
  );
});

module.exports = router;

