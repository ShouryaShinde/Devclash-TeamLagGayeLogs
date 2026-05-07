/**
 * Middleware: Require the user to be logged in.
 * Redirects to /login if no session exists.
 */
export function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/login");
}

/**
 * Middleware: Only allow guests (not-logged-in users).
 * Redirects to /dashboard if a session already exists.
 */
export function guestOnly(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect("/dashboard");
  }
  next();
}
