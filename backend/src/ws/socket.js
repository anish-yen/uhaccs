const { WebSocketServer } = require("ws");

let wss;
let activeUserSocket = null; // Single active user connection
let activeUserId = null; // Track which user is currently active

function setupWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("🔌 WebSocket client connected");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        // ── Register user (they opened the app tab) ──
        if (data.type === "register") {
          activeUserId = data.userId;
          activeUserSocket = ws;

          console.log(
            `✅ User ${activeUserId} is now active (app tab open)`
          );

          // Send acknowledgment
          ws.send(
            JSON.stringify({
              type: "registered",
              userId: activeUserId,
              message: "Connected to reminder system",
            })
          );
        }

        // ── User completed an activity ──
        if (data.type === "activity_completed") {
          const { reminderId, reminderType } = data;
          console.log(
            `✓ User ${activeUserId} completed activity: ${reminderType} (reminder ${reminderId})`
          );
        }
      } catch (err) {
        console.error("❌ WebSocket message parse error:", err);
      }
    });

    ws.on("close", () => {
      // User closed the app tab
      if (activeUserSocket === ws) {
        console.log(`🔌 User ${activeUserId} closed app tab (went to another tab)`);
        activeUserSocket = null;
        activeUserId = null;
      }
    });
  });

  console.log("🌐 WebSocket server attached");
}

// ── Send reminder notification ──
// If user is actively on the app: send via WebSocket (instant update)
// If user is away: WebSocket will queue it or use push notification
function sendReminder(userId, reminder) {
  if (!wss) return;

  // Check if the user is actively on the app
  if (activeUserId === userId && activeUserSocket) {
    // User is on the app tab → send via WebSocket immediately
    const payload = JSON.stringify({
      type: "reminder",
      reminderId: reminder.id,
      reminderType: reminder.type,
      message: `Time to ${reminder.type}!`,
      timestamp: new Date().toISOString(),
    });

    if (activeUserSocket.readyState === 1) {
      activeUserSocket.send(payload);
      console.log(`📨 WebSocket reminder sent to user ${userId} (app is active)`);
    }
  } else {
    // User is NOT on the app → send push notification
    // This would be handled by the frontend using Web Push API / Service Workers
    console.log(
      `📢 Push notification queued for user ${userId} (app is not active). They will see it when they click the notification.`
    );
    // TODO: Send push notification via Web Push API
    // In production, store this in DB and send via push service
  }
}


// ── Send score update to the active user ──
function broadcastScoreUpdate(userId, points, streak, totalPoints) {
  if (!wss) return;

  // Only send to the currently active user
  if (activeUserId === userId && activeUserSocket && activeUserSocket.readyState === 1) {
    const payload = JSON.stringify({
      type: "score_update",
      userId,
      pointsEarned: points,
      totalPoints,
      streakCount: streak,
      timestamp: new Date().toISOString(),
    });

    activeUserSocket.send(payload);
    console.log(
      `🏆 Score update sent to user ${userId}: +${points} points (total: ${totalPoints}, streak: ${streak})`
    );
  } else {
    console.log(
      `⚠️  User ${userId} not currently active. Score saved to database.`
    );
  }
}

// ── Send user profile/stats to the active user ──
function sendUserStats(userId, stats) {
  if (!wss) return;

  // Only send to the currently active user
  if (activeUserId === userId && activeUserSocket && activeUserSocket.readyState === 1) {
    const payload = JSON.stringify({
      type: "user_stats",
      userId,
      points: stats.points,
      streak: stats.streak,
      longestStreak: stats.longestStreak,
      timestamp: new Date().toISOString(),
    });

    activeUserSocket.send(payload);
    console.log(`📊 User stats sent to user ${userId}`);
  }
}

module.exports = {
  setupWebSocket,
  sendReminder,
  broadcastScoreUpdate,
  sendUserStats,
};
