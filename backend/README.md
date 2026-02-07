# UHaccs Backend

Health reminder backend — Express + SQLite + WebSocket + Redis.

## Quick Start

### Prerequisites

- Node.js 18+
- Redis server running (default: localhost:6379)

### Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:alpine
```

### Setup

```bash
cd backend
npm install
npm run dev      # starts with nodemon (auto-reload)
# or
npm start        # production
```

Server runs on **http://localhost:3001**

## Environment Variables

Create a `.env` file (optional):

```env
PORT=3001
REDIS_URL=redis://localhost:6379
```

## Project Structure

```
backend/
├── data/                  # SQLite database file (auto-created)
├── src/
│   ├── server.js          # Entry point — Express + WS setup
│   ├── db/
│   │   ├── init.js        # Database init & schema
│   │   └── redis.js       # Redis client setup
│   ├── routes/
│   │   ├── users.js       # User CRUD
│   │   ├── reminders.js   # Reminder CRUD
│   │   ├── verification.js # CV verification results
│   │   ├── exercises.js   # Exercise CRUD with Redis
│   │   ├── stats.js       # User stats with streak calculation
│   │   └── detection.js   # Exercise detection status
│   ├── ws/
│   │   └── socket.js      # WebSocket server for push notifications
│   └── scheduler/
│       └── reminderScheduler.js  # Interval-based reminder triggers
└── package.json
```

## API Endpoints

### Health
| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| GET    | `/api/health`             | Health check                   |

### Users
| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| POST   | `/api/users`              | Create user                    |
| GET    | `/api/users/:id`          | Get user profile               |

### Exercises (Redis-backed)
| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| GET    | `/api/exercises?userId=default` | Get all exercises      |
| GET    | `/api/exercises/:id?userId=default` | Get exercise by ID    |
| POST   | `/api/exercises`          | Create exercise (auto-calculates streak) |
| PUT    | `/api/exercises/:id?userId=default` | Update exercise      |
| DELETE | `/api/exercises/:id?userId=default` | Delete exercise      |

### User Stats (Redis-backed)
| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| GET    | `/api/user/stats?userId=default` | Get user stats (level, XP, streak, rank) |
| PUT    | `/api/user/stats`         | Update user stats              |

### Exercise Detection
| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| GET    | `/api/detection?userId=default` | Get detection status    |
| POST   | `/api/detection`          | Mark exercise as detected      |

## Features

### Streak Calculation
- Automatically calculates streak when exercises are created
- Tracks consecutive days of activity
- Resets streak if gap > 1 day
- Updates level and rank based on XP

### Redis Storage
- Exercises stored per user in Redis
- User stats stored in Redis
- Detection status stored with 1-hour expiration
- Fast read/write operations

### Level & Rank System
- **Level**: 1 level per 1000 XP
- **Ranks**:
  - Bronze: Levels 1-9
  - Silver: Levels 10-19
  - Gold: Levels 20-29
  - Platinum: Levels 30-49
  - Diamond: Level 50+

## WebSocket

Connect to `ws://localhost:3001`. Messages are JSON:

```json
// Server → Client: reminder notification
{
  "type": "reminder",
  "data": { ... }
}
```

## Development

```bash
npm run dev    # Auto-reload with nodemon
npm start      # Production mode
```

## Testing Redis Connection

```bash
redis-cli ping
# Should return: PONG
```
