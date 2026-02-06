# Quick Start: Testing Your Scheduler 🚀

## TL;DR - Test in 2 Minutes

```bash
cd /Users/shivendhruv/uhaccs/backend

# Terminal 1: Start the server
node src/server.js

# Terminal 2: Run the test script
./test.sh
```

**Expected Output:**

The test will show:
- ✅ Health check working
- ✅ User created
- ✅ 2 reminders created
- ✅ Reminders listed
- ✅ Verification logged

**In Terminal 1 (server logs), you'll see:**
```
✅ Scheduler started  → session=reminder-2  interval=1min
✅ Scheduler started  → session=reminder-3  interval=2min
⏰ [reminder-2] First notification (after 5s)
⏰ [reminder-3] First notification (after 5s)
⏰ [reminder-2] Reminder fired (every 1min)
⏰ [reminder-3] Reminder fired (every 2min)
```

---

## What Your Scheduler Does

### Core Functionality ✅
- **Tracks multiple schedulers** — Each reminder gets its own independent timer
- **First notification after 5 seconds** — User gets instant feedback
- **Recurring notifications** — Fires every N minutes as configured
- **Graceful start/stop** — Can start/stop individual schedulers without affecting others
- **Persistent across restarts** — `is_active=1` reminders auto-resume on server restart

### API Exported
```javascript
const scheduler = require('./scheduler/reminderScheduler');

// Generic schedulers (any sessionId)
scheduler.startScheduler(sessionId, minutes, callback)  // Start
scheduler.stopScheduler(sessionId)                       // Stop
scheduler.updateInterval(sessionId, minutes, callback)   // Change interval
scheduler.isActive(sessionId)                            // Check status
scheduler.getInterval(sessionId)                         // Get current interval
scheduler.getActiveSessions()                            // List all active
scheduler.stopAll()                                      // Graceful shutdown

// DB-backed reminder helpers
scheduler.startReminder(reminderRow)    // Schedule a DB reminder
scheduler.stopReminder(reminderId)      // Stop a DB reminder
scheduler.restartAll()                  // Load & schedule all is_active=1 reminders
```

---

## File Structure

```
backend/
├── src/
│   ├── server.js                 ← Calls restartAll() on startup + stopAll() on shutdown
│   ├── scheduler/
│   │   └── reminderScheduler.js  ← FULLY IMPLEMENTED scheduler with all functions
│   ├── db/
│   │   └── init.js               ← SQLite3 with callback API
│   ├── routes/
│   │   ├── reminders.js          ← POST/GET reminders
│   │   ├── users.js              ← POST/GET users
│   │   └── verification.js       ← POST verification (points logic TODO)
│   └── ws/
│       └── socket.js             ← WebSocket broadcasts reminders
├── test.sh                        ← Automated test script
├── TESTING.md                     ← Detailed test guide
├── SCHEDULER_TESTING.md           ← Scheduler deep dive
└── README.md                      ← Setup instructions
```

---

## Server Log Output Explained

### Startup
```
Database initialized           ← SQLite tables created
WebSocket server attached      ← WS listening
🛑 All schedulers stopped (0 total)
Server running on http://localhost:3001
✅ Loaded 0 active reminder(s) from DB  ← No saved reminders yet
```

### Creating a Reminder
```
✅ Scheduler started  → session=reminder-2  interval=1min
```

### After 5 Seconds
```
⏰ [reminder-2] First notification (after 5s)
```

### Every 1 Minute
```
⏰ [reminder-2] Reminder fired (every 1min)
```

### On Graceful Shutdown
```
Shutting down...
🛑 Scheduler stopped  → session=reminder-2
🛑 All schedulers stopped (1 total)
```

---

## Emoji Guide

| Emoji | Meaning |
|-------|---------|
| ✅ | Success / Scheduler started |
| 🛑 | Stopped / Shutdown |
| ⏰ | Notification fired |
| 🔄 | Interval updated |
| ❌ | Error / Validation failed |
| ⚠️  | Warning |

---

## How to Run Tests

### Option 1: Automated (Recommended)
```bash
cd /Users/shivendhruv/uhaccs/backend

# In Terminal 1: Start server
node src/server.js

# In Terminal 2: Run test suite
./test.sh
```

### Option 2: Manual with curl
```bash
# Create user
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}'

# Create reminder
curl -X POST http://localhost:3001/api/reminders \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"type":"water","interval_minutes":1}'

# Watch server logs for notifications
```

### Option 3: WebSocket Testing
```bash
# Terminal 1: Start server
node src/server.js

# Terminal 2: Connect to WebSocket
npm install -g wscat
wscat -c ws://localhost:3001

# You'll receive broadcast notifications when scheduler fires
```

---

## Example Test Run

### Commands
```bash
./test.sh
```

### Output
```
========================================
Health Reminder Backend - Test Suite
========================================

1. Testing health check endpoint...
{ "status": "ok" }

2. Creating test user 'bob'...
{ "id": 2, "username": "bob" }

3. Creating water reminder (1-minute interval)...
{ "id": 2 }

4. Creating exercise reminder (2-minute interval)...
{ "id": 3 }

5. Listing all reminders for user...
[
    {
        "id": 2,
        "user_id": 2,
        "type": "water",
        "interval_minutes": 1,
        "is_active": 1,
        "created_at": "2026-02-06 22:20:57"
    },
    {
        "id": 3,
        "user_id": 2,
        "type": "exercise",
        "interval_minutes": 2,
        "is_active": 1,
        "created_at": "2026-02-06 22:20:57"
    }
]

6. Getting user profile...
{ "id": 2, "username": "bob", "points": 0, ... }

7. Logging verification activity (water verified)...
{ "success": true, "verified": true }

8. Logging verification activity (exercise not verified)...
{ "success": true, "verified": false }

========================================
✅ All tests completed!
========================================
```

### What You'll See in Server Terminal

```
Database initialized
WebSocket server attached
🛑 All schedulers stopped (0 total)
Server running on http://localhost:3001
✅ Loaded 0 active reminder(s) from DB
✅ Scheduler started  → session=reminder-2  interval=1min
✅ Scheduler started  → session=reminder-3  interval=2min
⏰ [reminder-2] First notification (after 5s)
⏰ [reminder-3] First notification (after 5s)
⏰ [reminder-2] Reminder fired (every 1min)
⏰ [reminder-3] Reminder fired (every 2min)
⏰ [reminder-2] Reminder fired (every 1min)
```

---

## API Endpoints Summary

| Endpoint | Method | Status | What It Does |
|----------|--------|--------|-------------|
| `/api/health` | GET | ✅ | Check if server is running |
| `/api/users` | POST | ✅ | Create new user |
| `/api/users/:id` | GET | ✅ | Get user profile |
| `/api/reminders` | POST | ✅ | Create reminder → **Triggers scheduler** |
| `/api/reminders/:userId` | GET | ✅ | List user's reminders |
| `/api/verification` | POST | ✅ | Log verification (points TODO) |

---

## Key Implementation Details

### Why 5-second first notification?
Reminders are for testing. A 5-second delay is fast enough to verify the scheduler works without waiting for the full interval.

### Why two separate Maps?
```javascript
const activeTimers = new Map();        // Stores { intervalId, timeoutId }
const intervalSettings = new Map();    // Stores just the minutes
```
This separation allows:
- Quick cleanup (both timers at once)
- Easy querying (get current interval without deep inspection)

### Why `interval_minutes * 60 * 1000`?
```javascript
const intervalMs = intervalMinutes * 60 * 1000;
// Example: 5 minutes → 5 * 60 * 1000 = 300,000 ms
```

### How graceful shutdown works?
```javascript
process.on('SIGINT', () => {
  console.log("Shutting down...");
  stopAll();  // Clear all timers before exiting
  process.exit(0);
});
```

---

## What's Next?

The scheduler is production-ready! ✅

Now implement the **points & streak logic** in `/routes/verification.js`:

```javascript
// When verified === true:
1. Award points
   - +10 for water
   - +25 for exercise
   
2. Update current_streak
   - Increment by 1

3. Check longest_streak
   - If current_streak > longest_streak, update it

4. Broadcast score update via WebSocket
   - All connected clients see the new points/streak

5. Return { success: true, points: newTotal, streak: newCurrent }
```

Good luck! 🚀
