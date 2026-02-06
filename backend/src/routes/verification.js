const express = require("express");
const router = express.Router();
const { getDB } = require("../db/init");

// ── Points Configuration ────────────────────────────────────────────
const POINTS_MAP = {
  water: 10,      // Drinking water = 10 points
  exercise: 25,   // Exercise = 25 points
  default: 5,     // Unknown type = 5 points
};

const STREAK_BREAK_MINUTES = 120; // If no verification for 120min, streak breaks

// ── POST /api/verification ─────────────────────────────────────────
// Frontend sends: { user_id, reminder_id, type, verified }
// Returns: { success, points_awarded, total_points, streak, message }
router.post("/", (req, res) => {
  const { user_id, reminder_id, type, verified } = req.body;

  if (!user_id || !reminder_id || !type) {
    return res.status(400).json({ error: "user_id, reminder_id, and type are required" });
  }

  const db = getDB();

  // Get user's current points and streak before updating
  db.get(
    "SELECT points, current_streak, longest_streak, last_verified_at FROM users WHERE id = ?",
    [user_id],
    (err, user) => {
      if (err) {
        console.error("❌ DB error fetching user:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log the activity
      db.run(
        "INSERT INTO activity_log (user_id, reminder_id, type, verified) VALUES (?, ?, ?, ?)",
        [user_id, reminder_id, type, verified ? 1 : 0],
        (logErr) => {
          if (logErr) {
            console.error("❌ DB error logging activity:", logErr);
            return res.status(500).json({ error: "Failed to log activity" });
          }

          // If not verified, return without awarding points
          if (!verified) {
            console.log(`❌ [User ${user_id}] Verification FAILED for ${type}`);
            return res.json({
              success: false,
              message: "Verification failed — activity not detected",
              points_awarded: 0,
              total_points: user.points,
              current_streak: user.current_streak,
              longest_streak: user.longest_streak,
            });
          }

          // ── Verification Succeeded ────────────────────────────────

          // Calculate points based on type
          const basePoints = POINTS_MAP[type] || POINTS_MAP.default;

          // Calculate streak logic
          let newStreakCount = user.current_streak;
          const lastVerified = user.last_verified_at ? new Date(user.last_verified_at) : null;
          const now = new Date();

          if (lastVerified) {
            const minutesSinceLastVerification = (now - lastVerified) / (1000 * 60);
            if (minutesSinceLastVerification > STREAK_BREAK_MINUTES) {
              console.log(
                `🔗 [User ${user_id}] Streak RESET (${minutesSinceLastVerification.toFixed(0)}min gap)`
              );
              newStreakCount = 1; // Reset to 1
            } else {
              newStreakCount = user.current_streak + 1;
              console.log(`🔗 [User ${user_id}] Streak increased: ${user.current_streak} → ${newStreakCount}`);
            }
          } else {
            newStreakCount = 1; // First verification
            console.log(`🔗 [User ${user_id}] First verification, streak = 1`);
          }

          // Calculate streak bonus (5% per streak level, max 50%)
          const streakBonus = Math.floor(basePoints * Math.min(newStreakCount * 0.05, 0.5));
          const totalPointsAwarded = basePoints + streakBonus;
          const newTotalPoints = user.points + totalPointsAwarded;

          // Update longest streak if current streak is higher
          let newLongestStreak = user.longest_streak;
          if (newStreakCount > user.longest_streak) {
            newLongestStreak = newStreakCount;
            console.log(`🏆 [User ${user_id}] New longest streak: ${newLongestStreak}`);
          }

          // Update user points and streak
          db.run(
            `UPDATE users 
             SET points = ?, current_streak = ?, longest_streak = ?, last_verified_at = ? 
             WHERE id = ?`,
            [newTotalPoints, newStreakCount, newLongestStreak, now.toISOString(), user_id],
            (updateErr) => {
              if (updateErr) {
                console.error("❌ DB error updating user:", updateErr);
                return res.status(500).json({ error: "Failed to update points" });
              }

              console.log(
                `✅ [User ${user_id}] Verified ${type}: +${totalPointsAwarded} points ` +
                `(${basePoints} base + ${streakBonus} streak bonus). Total: ${newTotalPoints}. Streak: ${newStreakCount}`
              );

              res.json({
                success: true,
                message: `Great job! +${totalPointsAwarded} points 🎉`,
                points_awarded: totalPointsAwarded,
                base_points: basePoints,
                streak_bonus: streakBonus,
                total_points: newTotalPoints,
                current_streak: newStreakCount,
                longest_streak: newLongestStreak,
                type: type,
              });

              // TODO: Broadcast updated score via WebSocket to all clients
            }
          );
        }
      );
    }
  );
});

// ── GET /api/verification/:userId/history ─────────────────────────
// Get user's recent verification activity
router.get("/:userId/history", (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit || "20");

  const db = getDB();
  db.all(
    `SELECT * FROM activity_log 
     WHERE user_id = ? 
     ORDER BY completed_at DESC 
     LIMIT ?`,
    [userId, limit],
    (err, logs) => {
      if (err) {
        console.error("❌ DB error fetching history:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({
        success: true,
        user_id: userId,
        activities: logs || [],
        total_count: logs ? logs.length : 0,
      });
    }
  );
});

module.exports = router;
