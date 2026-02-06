# UHaccs Backend

Health reminder backend — Express + SQLite + WebSocket.

## Quick Start

```bash
cd backend
npm install
npm run dev      # starts with nodemon (auto-reload)
# or
npm start        # production
```

Server runs on **http://localhost:3001**

## Project Structure

```
backend/
├── data/                  # SQLite database file (auto-created)
├── src/
│   ├── server.js          # Entry point — Express + WS setup
│   ├── db/
│   │   └── init.js        # Database init & schema
│   ├── routes/
│   │   ├── users.js       # User CRUD + gamification stats
│   │   ├── reminders.js   # Reminder CRUD
│   │   └── verification.js # CV verification results from frontend
│   ├── ws/
│   │   └── socket.js      # WebSocket server for push notifications
│   └── scheduler/
│       └── reminderScheduler.js  # Interval-based reminder triggers
└── package.json
```

## API Endpoints

| Method | Endpoint                  | Status | Description                    |
|--------|---------------------------|--------|--------------------------------|
| GET    | `/api/health`             | ✅     | Health check                   |
| POST   | `/api/users`              | ✅     | Create user                    |
| GET    | `/api/users/:id`          | ✅     | Get user profile               |
| GET    | `/api/users/:id/stats`    | 🔲     | Detailed gamification stats    |
| POST   | `/api/reminders`          | ✅     | Create reminder                |
| GET    | `/api/reminders/:userId`  | ✅     | Get user's reminders           |
| PATCH  | `/api/reminders/:id`      | 🔲     | Update reminder                |
| DELETE | `/api/reminders/:id`      | 🔲     | Delete reminder                |
| POST   | `/api/verification`       | ✅     | Log CV verification result     |

## WebSocket

Connect to `ws://localhost:3001`. Messages are JSON:

```json
// Server → Client: reminder notification
{ "type": "reminder", "id": 1, "type": "water", "interval_minutes": 30 }

// Client → Server: register user for targeted notifications
{ "type": "register", "userId": 1 }
```

## TODO Checklist

- [ ] Implement `reminderScheduler.js` (setInterval-based push)
- [ ] Points & streak logic in `verification.js`
- [ ] WebSocket user targeting (Map<userId, ws>)
- [ ] Leaderboard broadcast
- [ ] User stats endpoint
- [ ] Reminder update/delete endpoints
- [ ] Paginated activity log
