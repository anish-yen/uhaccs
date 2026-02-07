const express = require("express");
const router = express.Router();
const { getDB } = require("../db/init");
const { markNotificationsAsSent } = require("../ws/socket");

// ── GET /api/notifications/:userId ──
// Retrieve pending notifications for a user (when they reconnect)
// Used by frontend to show queued notifications and ask permission for push
router.get("/:userId", (req, res) => {
  const { userId } = req.params;
  const db = getDB();

  db.all(
    `SELECT id, reminder_id, type, message, created_at 
     FROM pending_notifications 
     WHERE user_id = ? AND sent = 0 
     ORDER BY created_at ASC`,
    [userId],
    (err, notifications) => {
      if (err) {
        console.error("❌ DB error fetching notifications:", err);
        return res.status(500).json({ error: "Failed to fetch notifications" });
      }

      if (!notifications || notifications.length === 0) {
        return res.json({
          success: true,
          pending_notifications: [],
          message: "No pending notifications",
        });
      }

      // Mark these as sent (they'll be displayed to user now)
      const notificationIds = notifications.map((n) => n.id);
      markNotificationsAsSent(notificationIds);

      res.json({
        success: true,
        pending_notifications: notifications,
        count: notifications.length,
      });
    }
  );
});

// ── DELETE /api/notifications/:notificationId ──
// Mark a notification as dismissed
router.delete("/:notificationId", (req, res) => {
  const { notificationId } = req.params;
  const db = getDB();

  db.run(
    `UPDATE pending_notifications SET sent = 1 WHERE id = ?`,
    [notificationId],
    function (err) {
      if (err) {
        console.error("❌ DB error dismissing notification:", err);
        return res.status(500).json({ error: "Failed to dismiss notification" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({
        success: true,
        message: "Notification dismissed",
      });
    }
  );
});

module.exports = router;
