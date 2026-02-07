const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { getUserByGoogleId, createUser, updateUser } = require("../db/users");

// Only initialize if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `http://localhost:${process.env.PORT || 3001}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          let user = await getUserByGoogleId(profile.id);

          if (!user) {
            // Create new user
            user = await createUser({
              username: profile.emails[0]?.value?.split("@")[0] || `user_${profile.id}`,
              google_id: profile.id,
              email: profile.emails[0]?.value || null,
              display_name: profile.displayName || null,
              avatar_url: profile.photos[0]?.value || null,
            });
          } else {
            // Update user info
            user = await updateUser(user.id, {
              email: profile.emails[0]?.value || null,
              display_name: profile.displayName || null,
              avatar_url: profile.photos[0]?.value || null,
            });
          }

          return done(null, user);
        } catch (err) {
          console.error("Passport strategy error:", err);
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn("⚠️  Google OAuth credentials not configured. OAuth will not work.");
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { getUserById } = require("../db/users");
    const user = await getUserById(id);
    done(null, user);
  } catch (err) {
    console.error("Deserialize user error:", err);
    done(err, null);
  }
});

module.exports = passport;

