const express = require("express");
const cors = require("cors");
const http = require("http");
const { initDB } = require("./db/init");
const { setupWebSocket } = require("./ws/socket");
const { restartAll, stopAll } = require("./scheduler/reminderScheduler");
const reminderRoutes = require("./routes/reminders");
const userRoutes = require("./routes/users");
const verificationRoutes = require("./routes/verification");
const waterRoutes = require("./routes/water");
const statsRoutes = require("./routes/stats");
const detectionRoutes = require("./routes/detection");
const exerciseRoutes = require("./routes/exercises");

const app = express();
const server = http.createServer(app);

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Request logger — helps debug frontend ↔ backend communication
app.use((req, _res, next) => {
  if (req.url.includes('/stats') || req.url.includes('/verification')) {
    console.log(`📡 ${req.method} ${req.url}`);
  }
  next();
});

// --- Routes ---
app.use("/api/reminders", reminderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/water", waterRoutes);
app.use("/api/user", statsRoutes);        // GET/PUT /api/user/stats
app.use("/api/detection", detectionRoutes); // GET/POST /api/detection
app.use("/api/exercises", exerciseRoutes);  // GET /api/exercises

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
