# OAuth 2.0 Explained

## What is OAuth 2.0?

OAuth 2.0 is an authorization framework that allows applications to obtain limited access to user accounts on an HTTP service. It enables users to grant third-party applications access to their information without sharing their passwords.

## How OAuth 2.0 Works (Step by Step)

### 1. **User Initiates Login**
```
User clicks "Sign in with Google" → Frontend redirects to:
http://localhost:3001/api/auth/google
```

### 2. **Backend Redirects to Google**
```
Backend receives request → Uses Passport.js Google Strategy
→ Redirects user to Google's authorization server with:
  - Client ID (identifies your app)
  - Redirect URI (where Google sends user back)
  - Scopes (what permissions you're requesting: profile, email)
```

**Example Google URL:**
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID
  &redirect_uri=http://localhost:3001/api/auth/google/callback
  &response_type=code
  &scope=profile%20email
  &state=random_state_string
```

### 3. **User Authenticates with Google**
```
User sees Google login page
→ Enters credentials
→ Google verifies identity
→ User grants permissions (profile, email)
```

### 4. **Google Redirects Back with Authorization Code**
```
Google redirects to your callback URL:
http://localhost:3001/api/auth/google/callback?code=AUTHORIZATION_CODE&state=random_state_string
```

**Important:** This is an **authorization code**, not the actual user data. It's temporary and can only be used once.

### 5. **Backend Exchanges Code for Access Token**
```
Backend receives authorization code
→ Makes server-to-server request to Google:
  POST https://oauth2.googleapis.com/token
  - client_id: YOUR_CLIENT_ID
  - client_secret: YOUR_CLIENT_SECRET (secret, never exposed to frontend!)
  - code: AUTHORIZATION_CODE
  - grant_type: authorization_code
  - redirect_uri: http://localhost:3001/api/auth/google/callback

→ Google responds with:
  - access_token: Token to access user's Google data
  - refresh_token: Token to get new access tokens
  - expires_in: How long access token is valid
```

### 6. **Backend Gets User Profile**
```
Backend uses access_token to fetch user info:
GET https://www.googleapis.com/oauth2/v2/userinfo
Headers: Authorization: Bearer ACCESS_TOKEN

→ Google responds with:
  - id: Google user ID
  - email: User's email
  - name: User's display name
  - picture: User's profile picture
```

### 7. **Backend Creates/Updates User Session**
```
Backend:
1. Checks if user exists in database (by google_id)
2. Creates new user OR updates existing user
3. Creates session (stored in Redis)
4. Serializes user ID into session
5. Sets session cookie in response
```

### 8. **Backend Redirects to Frontend**
```
Backend redirects to:
http://localhost:3000/auth/callback?success=true

Frontend receives callback
→ Checks session with /api/auth/me
→ Gets user data
→ Redirects to dashboard
```

## Key Concepts

### Authorization Code Flow
This is the flow we're using. It's the most secure because:
- The authorization code is short-lived
- The client secret never leaves the server
- Access tokens are server-side only

### Sessions vs Tokens

**Sessions (What we're using):**
- Server stores session data in Redis
- Client gets a session cookie
- Server looks up session on each request
- More secure for server-side apps

**Tokens (JWT):**
- Server creates signed token with user data
- Client stores token (localStorage/cookie)
- Client sends token with each request
- Server validates token signature
- Better for stateless APIs

### Why We Use Redis for Sessions

1. **Scalability**: Multiple server instances can share sessions
2. **Persistence**: Sessions survive server restarts
3. **Performance**: Fast lookups
4. **Expiration**: Automatic cleanup of old sessions

## Security Features

### 1. **Client Secret Protection**
- Never exposed to frontend
- Only used in server-to-server communication
- Stored in environment variables

### 2. **State Parameter**
- Prevents CSRF attacks
- Random string sent with request
- Must match on callback

### 3. **HTTPS in Production**
- Encrypts all communication
- Prevents man-in-the-middle attacks
- Required for secure cookies

### 4. **Session Security**
- HttpOnly cookies (JavaScript can't access)
- Secure flag (HTTPS only in production)
- SameSite protection (CSRF prevention)
- Expiration (sessions expire after 30 days)

## Flow Diagram

```
┌─────────┐         ┌──────────┐         ┌─────────┐
│ Browser │         │ Backend  │         │ Google  │
└────┬────┘         └────┬─────┘         └────┬────┘
     │                   │                     │
     │ 1. Click Login    │                     │
     │──────────────────>│                     │
     │                   │                     │
     │ 2. Redirect       │                     │
     │<──────────────────│                     │
     │                   │                     │
     │ 3. Redirect to Google                   │
     │─────────────────────────────────────────>│
     │                   │                     │
     │ 4. User logs in   │                     │
     │                   │                     │
     │ 5. Redirect with code                   │
     │<─────────────────────────────────────────│
     │                   │                     │
     │ 6. Exchange code  │                     │
     │──────────────────>│                     │
     │                   │ 7. Request token    │
     │                   │────────────────────>│
     │                   │ 8. Return token     │
     │                   │<────────────────────│
     │                   │                     │
     │                   │ 9. Get user info    │
     │                   │────────────────────>│
     │                   │ 10. Return profile  │
     │                   │<────────────────────│
     │                   │                     │
     │                   │ 11. Create session  │
     │                   │                     │
     │ 12. Redirect      │                     │
     │<──────────────────│                     │
     │                   │                     │
     │ 13. Get user      │                     │
     │──────────────────>│                     │
     │ 14. Return user   │                     │
     │<──────────────────│                     │
```

## Common Issues and Solutions

### Issue: "Redirect URI mismatch"
**Cause:** Callback URL in Google Console doesn't match exactly
**Solution:** Ensure exact match including protocol, domain, port, and path

### Issue: "Invalid client"
**Cause:** Client ID or secret is wrong
**Solution:** Check .env file and Google Console

### Issue: "Session not persisting"
**Cause:** Cookies not being sent or Redis not running
**Solution:** 
- Check Redis is running: `redis-cli ping`
- Check browser allows cookies
- Verify CORS credentials: true

### Issue: "ECONNRESET" errors
**Cause:** Backend not running or connection dropped
**Solution:**
- Ensure backend is running on correct port
- Check firewall settings
- Verify network connectivity

## Environment Variables Needed

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Session
SESSION_SECRET=random-secret-string
FRONTEND_URL=http://localhost:3000

# Redis
REDIS_URL=redis://localhost:6379
```

## Testing OAuth Locally

1. **Start Redis:**
   ```bash
   redis-server
   ```

2. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Test Flow:**
   - Open http://localhost:3000
   - Click "Sign in with Google"
   - Should redirect to Google
   - After login, should redirect back to dashboard

## Production Considerations

1. **Use HTTPS** for all URLs
2. **Strong SESSION_SECRET** (use `openssl rand -base64 32`)
3. **Update callback URLs** in Google Console
4. **Set secure cookie flags** in production
5. **Monitor session expiration** and handle gracefully
6. **Rate limiting** on auth endpoints
7. **Log authentication events** for security

