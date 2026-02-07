// User management using Redis instead of SQLite
const { getRedisClient } = require("./redis");

const USER_KEY = (userId) => `user:${userId}`;
const USER_BY_GOOGLE_ID_KEY = (googleId) => `user:google:${googleId}`;

async function getUserById(userId) {
  const client = await getRedisClient();
  const userJson = await client.get(USER_KEY(userId));
  return userJson ? JSON.parse(userJson) : null;
}

async function getUserByGoogleId(googleId) {
  const client = await getRedisClient();
  const userId = await client.get(USER_BY_GOOGLE_ID_KEY(googleId));
  if (!userId) return null;
  return getUserById(userId);
}

async function createUser(userData) {
  const client = await getRedisClient();
  
  // Generate ID if not provided
  let userId = userData.id;
  if (!userId) {
    // Use timestamp + random to ensure uniqueness
    userId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Check if username already exists (if provided)
  if (userData.username) {
    const usernameKey = `user:username:${userData.username}`;
    const existingUserId = await client.get(usernameKey);
    if (existingUserId && existingUserId !== userId) {
      throw new Error("Username already exists");
    }
  }
  
  const user = {
    id: userId,
    username: userData.username,
    google_id: userData.google_id || null,
    email: userData.email || null,
    display_name: userData.display_name || null,
    avatar_url: userData.avatar_url || null,
    points: userData.points || 0,
    current_streak: userData.current_streak || 0,
    longest_streak: userData.longest_streak || 0,
    created_at: userData.created_at || new Date().toISOString(),
  };
  
  await client.set(USER_KEY(userId), JSON.stringify(user));
  
  if (user.google_id) {
    await client.set(USER_BY_GOOGLE_ID_KEY(user.google_id), userId);
  }
  
  if (user.username) {
    await client.set(`user:username:${user.username}`, userId);
  }
  
  return user;
}

async function updateUser(userId, updates) {
  const client = await getRedisClient();
  const existing = await getUserById(userId);
  if (!existing) return null;
  
  // Handle username change
  if (updates.username && updates.username !== existing.username) {
    // Remove old username mapping
    if (existing.username) {
      await client.del(`user:username:${existing.username}`);
    }
    // Add new username mapping
    await client.set(`user:username:${updates.username}`, userId);
  }
  
  // Handle google_id change
  if (updates.google_id && updates.google_id !== existing.google_id) {
    // Remove old mapping
    if (existing.google_id) {
      await client.del(USER_BY_GOOGLE_ID_KEY(existing.google_id));
    }
    // Add new mapping
    await client.set(USER_BY_GOOGLE_ID_KEY(updates.google_id), userId);
  }
  
  const updated = { ...existing, ...updates };
  await client.set(USER_KEY(userId), JSON.stringify(updated));
  
  return updated;
}

module.exports = {
  getUserById,
  getUserByGoogleId,
  createUser,
  updateUser,
};

