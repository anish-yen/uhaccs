const { getDB } = require("../db/init");
const { sendReminder } = require("../ws/socket");

// ── Data structures ────────────────────────────────────────────────
// sessionId → { intervalId, timeoutId }   (handles for clearing)
const activeTimers = new Map();
// sessionId → intervalMinutes             (for tracking / queries)
const intervalSettings = new Map();

const MIN_INTERVAL = 1;
const MAX_INTERVAL = 60;
const FIRST_NOTIFICATION_DELAY_MS = 5000; // 5 seconds – helpful for testing

// ── Core: start a scheduler ────────────────────────────────────────
const startScheduler = (sessionId, intervalMinutes, onNotify) => {
  // Validate interval range
  if (
    typeof intervalMinutes !== "number" ||
    intervalMinutes < MIN_INTERVAL ||
    intervalMinutes > MAX_INTERVAL
  ) {
    console.error(
      `❌ Invalid interval (${intervalMinutes}) for session ${sessionId}. Must be ${MIN_INTERVAL}-${MAX_INTERVAL} minutes.`
    );
    return false;
  }

  // If a scheduler already exists for this session, stop it first
  if (activeTimers.has(sessionId)) {
    stopScheduler(sessionId);
  }

  const intervalMs = intervalMinutes * 60 * 1000;

  // Fire the first notification quickly (5s) so the user gets instant feedback
  const timeoutId = setTimeout(() => {
    console.log(`⏰ [${sessionId}] First notification (after ${FIRST_NOTIFICATION_DELAY_MS / 1000}s)`);
    onNotify(sessionId);
  }, FIRST_NOTIFICATION_DELAY_MS);

  // Then repeat at the configured interval
  const intervalId = setInterval(() => {
    console.log(`⏰ [${sessionId}] Reminder fired (every ${intervalMinutes}min)`);
    onNotify(sessionId);
  }, intervalMs);

  // Store handles so we can clear them later
  activeTimers.set(sessionId, { intervalId, timeoutId });
  intervalSettings.set(sessionId, intervalMinutes);

  console.log(`✅ Scheduler started  → session=${sessionId}  interval=${intervalMinutes}min`);
  return true;
};

// ── Core: stop a scheduler ─────────────────────────────────────────
const stopScheduler = (sessionId) => {
  const handles = activeTimers.get(sessionId);
  if (!handles) {
    console.log(`⚠️  No active scheduler for session ${sessionId}`);
    return false;
  }

  clearTimeout(handles.timeoutId);
  clearInterval(handles.intervalId);
  activeTimers.delete(sessionId);
  intervalSettings.delete(sessionId);

  console.log(`🛑 Scheduler stopped  → session=${sessionId}`);
  return true;
};

// ── Helpers ─────────────────────────────────────────────────────────

// Restart a session with a new interval (delegates to start which auto-stops old one)
const updateInterval = (sessionId, newIntervalMinutes, onNotify) => {
  if (!activeTimers.has(sessionId)) {
    console.error(`❌ Cannot update – no active scheduler for session ${sessionId}`);
    return false;
  }
  console.log(`🔄 Updating interval  → session=${sessionId}  newInterval=${newIntervalMinutes}min`);
  return startScheduler(sessionId, newIntervalMinutes, onNotify);
};

// Check whether a session has a running scheduler
const isActive = (sessionId) => activeTimers.has(sessionId);

// Get the current interval (in minutes) for a session, or null
const getInterval = (sessionId) => intervalSettings.get(sessionId) ?? null;

// List every session that currently has a scheduler running
const getActiveSessions = () => [...activeTimers.keys()];

// Graceful shutdown — stop every scheduler at once
const stopAll = () => {
  const sessions = getActiveSessions();
  sessions.forEach((sessionId) => stopScheduler(sessionId));
  console.log(`🛑 All schedulers stopped (${sessions.length} total)`);
};

// ── DB-backed helpers (used by server.js on startup) ────────────────

// Load all active reminders from the database and schedule them
const restartAll = () => {
  stopAll();

  const db = getDB();
  db.all("SELECT * FROM reminders WHERE is_active = 1", (err, reminders) => {
    if (err) {
      console.error("Failed to load reminders:", err);
      return;
    }

    reminders.forEach((reminder) => {
      startScheduler(
        `reminder-${reminder.id}`,
        reminder.interval_minutes,
        () => sendReminder(reminder.user_id, reminder)
      );
    });

    console.log(`✅ Loaded ${reminders.length} active reminder(s) from DB`);
  });
};

// Convenience wrapper: schedule a single reminder row from the DB
const startReminder = (reminder) => {
  return startScheduler(
    `reminder-${reminder.id}`,
    reminder.interval_minutes,
    () => sendReminder(reminder.user_id, reminder)
  );
};

// Stop a single DB-backed reminder by its id
const stopReminder = (reminderId) => {
  return stopScheduler(`reminder-${reminderId}`);
};

module.exports = {
  // Generic scheduler (any session)
  startScheduler,
  stopScheduler,
  updateInterval,
  isActive,
  getInterval,
  getActiveSessions,
  stopAll,

  // DB-backed reminder helpers
  startReminder,
  stopReminder,
  restartAll,
};
