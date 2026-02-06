const { WebSocketServer } = require("ws");

let wss;

function setupWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (message) => {
      // TODO: Handle incoming messages from frontend
      // Expected message types:
      //   { type: "register", userId: 1 }        — associate this socket with a user
      //   { type: "ack", reminderId: 5 }          — user acknowledged a reminder
      console.log("Received:", message.toString());
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });

  console.log("WebSocket server attached");
}

// Send a reminder notification to a specific client
// TODO: Maintain a Map<userId, ws> so we can target specific users
function sendReminder(userId, reminder) {
  // Placeholder — broadcast to all for now
  if (!wss) return;
  const payload = JSON.stringify({ type: "reminder", ...reminder });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

// TODO: Broadcast leaderboard / score updates to all connected clients
function broadcastScoreUpdate(userId, points, streak) {
  // ...
}

module.exports = { setupWebSocket, sendReminder, broadcastScoreUpdate };
