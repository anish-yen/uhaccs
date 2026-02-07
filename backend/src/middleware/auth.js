// Authentication middleware
function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

function optionalAuth(req, res, next) {
  // If authenticated, attach user; if not, continue anyway
  next();
}

module.exports = { requireAuth, optionalAuth };

