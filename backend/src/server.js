const express = require("express");
const cors = require("cors");
const http = require("http");
const { initDB } = require("./db/init");
const { setupWebSocket } = require("./ws/socket");
const { restartAll, stopAll } = require("./scheduler/reminderScheduler");
const reminderRoutes = require("./routes/reminders");
const userRoutes = require("./routes/users");
const verificationRoutes = require("./routes/verification");

const app = express();
const server = http.createServer(app);

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use("/api/reminders", reminderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/verification", verificationRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Start ---
const PORT = process.env.PORT || 3001;

initDB()
  .then(() => {
    setupWebSocket(server);
    restartAll(); // Resume all active reminders from the database
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });

// Graceful shutdown — clear all scheduler intervals
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  stopAll();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});
