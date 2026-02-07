# Testing Guide for Health Reminder Backend

The server is running on **http://localhost:3001**

## 1. Creating a Test User

### Command:
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"alice"}'
```

### Expected Output:
```json
{
  "id": 1,
  "username": "alice"
}
```

Save the user ID (`1` in this example) — you'll need it for reminders.

---

## 2. Creating Reminders

### Command (Create a water reminder every 5 minutes):
```bash
curl -X POST http://localhost:3001/api/reminders \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"type":"water","interval_minutes":5}'
```

### Expected Output:
```json
{
  "id": 1
}
```

### Command (Create an exercise reminder every 10 minutes):
```bash
curl -X POST http://localhost:3001/api/reminders \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"type":"exercise","interval_minutes":10}'
```

### Expected Output:
```json
{
  "id": 2
}
```

---

## 3. Listing Reminders for a User

### Command:
```bash
curl http://localhost:3001/api/reminders/1
```

### Expected Output:
```json
[
  {
    "id": 1,
    "user_id": 1,
    "type": "water",
    "interval_minutes": 5,
    "is_active": 1,
    "created_at": "2026-02-06 10:30:45"
  },
  {
    "id": 2,
    "user_id": 1,
    "type": "exercise",
    "interval_minutes": 10,
    "is_active": 1,
    "created_at": "2026-02-06 10:30:50"
  }
]
```

---

## 4. Watching the Scheduler in Action

Once you create reminders, **look at the server terminal output**. You should see:

### First Reminder (fires after 5 seconds):
```
✅ Scheduler started  → session=reminder-1  interval=5min
⏰ [reminder-1] First notification (after 5s)
⏰ [reminder-1] Reminder fired (every 5min)
```

### Repeating Notifications:
Every 5 minutes, the water reminder will fire:
```
⏰ [reminder-1] Reminder fired (every 5min)
```

Every 10 minutes, the exercise reminder will fire:
```
⏰ [reminder-2] Reminder fired (every 10min)
```

---

## 5. Health Check

### Command:
```bash
curl http://localhost:3001/api/health
```

### Expected Output:
```json
{
  "status": "ok"
}
```

---

## 6. Logging Activity (Verification)

Simulate the frontend sending CV verification results:

### Command (User verified they drank water):
```bash
curl -X POST http://localhost:3001/api/verification \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"reminder_id":1,"type":"water","verified":true}'
```

### Expected Output:
```json
{
  "success": true,
  "verified": true
}
```

### Command (User couldn't be verified):
```bash
curl -X POST http://localhost:3001/api/verification \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"reminder_id":1,"type":"water","verified":false}'
```

### Expected Output:
```json
{
  "success": true,
  "verified": false
}
```

---

## 7. Get User Profile

### Command:
```bash
curl http://localhost:3001/api/users/1
```

### Expected Output (currently):
```json
{
  "id": 1,
  "username": "alice",
  "points": 0,
  "current_streak": 0,
  "longest_streak": 0,
  "created_at": "2026-02-06 10:30:45"
}
```

> **Note:** Points and streaks are currently hardcoded at `0`. You'll implement the points logic in the verification route later.

---

## 8. WebSocket Connection Testing

Use a WebSocket client (like `wscat` or your browser console):

### Install wscat (if not already installed):
```bash
npm install -g wscat
```

### Connect:
```bash
wscat -c ws://localhost:3001
```

### Expected behavior:
- You'll see `Connected (press CTRL+C to quit)`
- The server logs: `WebSocket client connected`

### Send a registration message:
```json
{"type":"register","userId":1}
```

The server will log:
```
Received: {"type":"register","userId":1}
```

### Watch for reminders:
When the scheduler fires, check your WebSocket client — it **should receive** broadcast notifications like:
```json
{"type":"reminder","id":1,"user_id":1,"type":"water","interval_minutes":5,"is_active":1,"created_at":"2026-02-06 10:30:45"}
```

---

## 9. Complete End-to-End Workflow

```bash
# 1. Create a user
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"bob"}' | jq .id

# 2. Create a 1-minute water reminder (for quick testing)
curl -X POST http://localhost:3001/api/reminders \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"type":"water","interval_minutes":1}'

# 3. Wait 5 seconds and check server logs
# You'll see: ⏰ [reminder-3] First notification (after 5s)

# 4. Wait 1 minute and check server logs again
# You'll see: ⏰ [reminder-3] Reminder fired (every 1min)

# 5. Log some activity
curl -X POST http://localhost:3001/api/verification \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"reminder_id":3,"type":"water","verified":true}'

# 6. Check user still has 0 points (TODO: implement points logic)
curl http://localhost:3001/api/users/1 | jq .points
```

---

## Summary: What You Should See

### ✅ Server Starts Successfully
```
Database initialized
WebSocket server attached
🛑 All schedulers stopped (0 total)
Server running on http://localhost:3001
✅ Loaded 0 active reminder(s) from DB
```

### ✅ When You Create a Reminder
```
✅ Scheduler started  → session=reminder-1  interval=5min
⏰ [reminder-1] First notification (after 5s)
⏰ [reminder-1] Reminder fired (every 5min)
```

### ✅ Repeating Notifications
```
⏰ [reminder-1] Reminder fired (every 5min)
⏰ [reminder-2] Reminder fired (every 10min)
```

### ✅ When You Stop the Server
```
^C
Shutting down...
🛑 Scheduler stopped  → session=reminder-1
🛑 Scheduler stopped  → session=reminder-2
🛑 All schedulers stopped (2 total)
```

### ✅ API Responses Are JSON
All endpoints return proper JSON with correct status codes:
- `201` for successful creates
- `200` for successful reads
- `400` for validation errors
- `404` for not found
- `500` for server errors

---

## Tips

- **Emojis in logs** help you spot what's happening:
  - ✅ = Scheduler started
  - 🛑 = Scheduler stopped
  - ⏰ = Notification fired
  - 🔄 = Interval updated
  - ❌ = Error

- **First notification is 5 seconds** (not the full interval) — this is for testing so you don't have to wait long

- **Scheduler auto-resumes** on server restart — all `is_active = 1` reminders reload automatically

- **Graceful shutdown** via `Ctrl+C` — all timers are cleared properly
