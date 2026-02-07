# SQLite Removed

SQLite (`better-sqlite3` and `sqlite3`) has been removed from the project due to build issues with Node.js v24 and C++20 requirements.

## What Changed

### All data is now stored in Redis:

- **Users**: `user:{userId}` and `user:google:{googleId}`
- **Exercises**: `user:{userId}:exercises`
- **Stats**: `user:{userId}:stats`
- **Detection**: `user:{userId}:detection`
- **Reminders**: `user:{userId}:reminders`
- **Activity Log**: `user:{userId}:activity_log`

### Updated Files:

- `src/db/init.js` - Now just initializes Redis connection
- `src/db/users.js` - New Redis-based user management
- `src/config/passport.js` - Uses Redis for user storage
- `src/routes/users.js` - Uses Redis
- `src/routes/reminders.js` - Uses Redis
- `src/routes/verification.js` - Uses Redis
- `src/scheduler/reminderScheduler.js` - Updated to use Redis

### Benefits:

- ✅ No build issues
- ✅ Faster performance (Redis is in-memory)
- ✅ Better scalability
- ✅ Simpler deployment (no SQLite file management)

### Migration:

If you had existing SQLite data, you'll need to migrate it to Redis. For new installations, everything starts fresh in Redis.

## Installation

Now you can install without build errors:

```bash
cd backend
npm install
```

No C++ compilation needed!

