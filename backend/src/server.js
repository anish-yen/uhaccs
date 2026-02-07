require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const session = require("express-session");
// SQLite removed - using Redis only
const { initDB } = require("./db/init");
const { setupWebSocket } = require("./ws/socket");
const { closeRedis, getRedisClient } = require("./db/redis");
const { getSessionStore } = require("./db/sessionStore");
const passport = require("./config/passport");
const reminderRoutes = require("./routes/reminders");
const userRoutes = require("./routes/users");
const verificationRoutes = require("./routes/verification");
const exerciseRoutes = require("./routes/exercises");
const statsRoutes = require("./routes/stats");
const detectionRoutes = require("./routes/detection");
const authRoutes = require("./routes/auth");
const poseRoutes = require("./routes/pose");

const app = express();
const server = http.createServer(app);

// --- Middleware ---
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Initialize session middleware (must be done before routes)
async function setupSession() {
  try {
    const sessionStore = await getSessionStore();
    const sessionMiddleware = session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
    });
    
    // Add session middleware BEFORE routes
    app.use(sessionMiddleware);
    app.use(passport.initialize());
    app.use(passport.session());
    
    console.log("✅ Session middleware configured");
    return true;
  } catch (err) {
    console.error("Failed to setup session:", err);
    throw err;
  }
}

// --- Routes (will be registered after session is set up) ---
function registerRoutes() {
  app.use("/api/auth", authRoutes);
  app.use("/api/reminders", reminderRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/verification", verificationRoutes);
  app.use("/api/exercises", exerciseRoutes);
  app.use("/api/user/stats", statsRoutes);
  app.use("/api/detection", detectionRoutes);
  app.use("/api/pose", poseRoutes);
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Start ---
const PORT = process.env.PORT || 3001;

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing Redis connection...");
  await closeRedis();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing Redis connection...");
  await closeRedis();
  process.exit(0);
});

initDB()
  .then(async () => {
    try {
      // Initialize Redis connection
      await getRedisClient();
      
      // Setup session AFTER Redis is ready, but BEFORE routes
      await setupSession();
      
      // Now register routes (session middleware is already in place)
      registerRoutes();
      
    } catch (err) {
      console.error("\n❌ Redis connection failed!");
      console.error("   Please start Redis:");
      console.error("   - macOS: brew services start redis");
      console.error("   - Linux: sudo systemctl start redis");
      console.error("   - Or: redis-server");
      console.error("\n   The server cannot start without Redis.\n");
      process.exit(1);
    }
    
    setupWebSocket(server);
    server.listen(PORT, () => {
      console.log(`\n✅ Server running on http://localhost:${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        console.log(`✅ OAuth configured - Callback URL: ${process.env.GOOGLE_CALLBACK_URL || `http://localhost:${PORT}/api/auth/google/callback`}`);
      } else {
        console.log(`⚠️  OAuth not configured - Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env`);
      }
      console.log("");
    });
  })
  .catch((err) => {
    console.error("\n❌ Failed to initialize server:", err.message);
    console.error("\nTroubleshooting:");
    console.error("1. Is Redis running? Try: redis-cli ping");
    console.error("2. Check backend/.env file exists");
    console.error("3. Check backend logs above for errors\n");
    process.exit(1);
  });
