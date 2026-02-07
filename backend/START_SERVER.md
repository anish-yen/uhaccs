# How to Start the Backend Server

## ECONNREFUSED Error Fix

The "ECONNREFUSED" or "localhost refused to connect" error means the backend server isn't running.

## Quick Start (3 Steps)

### Step 1: Start Redis

**macOS:**
```bash
brew services start redis
```

**Linux:**
```bash
sudo systemctl start redis
```

**Or run directly:**
```bash
redis-server
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

### Step 2: Install Dependencies (if not done)

```bash
cd backend
npm install
```

### Step 3: Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
✅ Redis Client Connected
Database (Redis) initialized
✅ Server running on http://localhost:3001
   Health check: http://localhost:3001/api/health
```

## Verify It's Working

**Test the health endpoint:**
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok"}
```

Or open in browser: http://localhost:3001/api/health

## Common Issues

### Issue: "Redis connection failed"
**Solution:** Start Redis first (see Step 1)

### Issue: "Port 3001 already in use"
**Solution:** 
```bash
# Find what's using the port
lsof -ti:3001

# Kill it (replace PID with actual process ID)
kill -9 PID

# Or change port in .env
PORT=3002
```

### Issue: "Cannot find module"
**Solution:**
```bash
cd backend
npm install
```

### Issue: "ECONNREFUSED" in frontend
**Solution:** 
1. Make sure backend is running (see Step 3)
2. Check backend is on port 3001
3. Check frontend is trying to connect to correct URL

## Running in Background

**Using PM2:**
```bash
npm install -g pm2
cd backend
pm2 start src/server.js --name backend
pm2 logs backend
```

**Using screen:**
```bash
screen -S backend
cd backend
npm run dev
# Press Ctrl+A then D to detach
# Reattach with: screen -r backend
```

**Using tmux:**
```bash
tmux new -s backend
cd backend
npm run dev
# Press Ctrl+B then D to detach
# Reattach with: tmux attach -t backend
```

## Development Workflow

**Terminal 1 - Redis:**
```bash
redis-server
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

## Check Server Status

```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Check if Redis is running
redis-cli ping

# Check what's on port 3001
lsof -i:3001
```

## Environment Variables

Make sure `backend/.env` exists:

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-secret-here
```

## Still Not Working?

1. **Check backend logs** - Look for error messages
2. **Check Redis** - `redis-cli ping` should return PONG
3. **Check port** - Make sure nothing else is using port 3001
4. **Check .env** - Make sure it exists and has correct values
5. **Restart everything** - Stop all processes and start fresh

