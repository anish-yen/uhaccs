# OAuth Quick Start Guide

## Fix ECONNRESET Errors

The `ECONNRESET` error occurs when the frontend tries to call `/api/auth/me` but:
1. Backend isn't running, OR
2. OAuth isn't configured

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Create `.env` File

Create `backend/.env`:

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
SESSION_SECRET=change-this-to-random-string
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

**Generate SESSION_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Get Google OAuth Credentials

1. Go to https://console.cloud.google.com/
2. Create project or select existing
3. Enable "Google+ API" in APIs & Services > Library
4. Go to APIs & Services > Credentials
5. Create OAuth 2.0 Client ID:
   - Type: Web application
   - Authorized redirect URIs: `http://localhost:3001/api/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

### 4. Start Services

**Terminal 1 - Redis:**
```bash
redis-server
# or
brew services start redis  # macOS
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

### 5. Test

1. Open http://localhost:3000
2. Should redirect to login page
3. Click "Continue with Google"
4. Sign in
5. Should redirect to dashboard

## Troubleshooting

### Error: "OAuth not configured"
- Check `.env` file exists
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Restart backend after adding credentials

### Error: "ECONNRESET"
- Backend not running → Start with `npm run dev`
- Wrong port → Check backend is on port 3001
- Redis not running → Start Redis

### Error: "Redirect URI mismatch"
- Check Google Console redirect URI matches exactly:
  - `http://localhost:3001/api/auth/google/callback`
- No trailing slashes, correct protocol

### Session not working
- Check Redis is running: `redis-cli ping` → should return `PONG`
- Check `SESSION_SECRET` is set in `.env`
- Clear browser cookies and try again

## How It Works

See `OAUTH2_EXPLAINED.md` for detailed explanation of the OAuth 2.0 flow.

## Without OAuth (Development Only)

If you don't want to set up OAuth for development:

1. Don't set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
2. Backend will work but show warning: "OAuth not configured"
3. Frontend will try to authenticate but fail gracefully
4. You can still use the app with `userId=default` in query params

For production, OAuth is required for proper user data isolation.

