/**
 * Authentication and Authorization Middleware
 * Validates active session and protects routes by role
 */

export function requireParticipant(req, res, next) {
  if (req.session && req.session.participantId && req.session.role === 'participant') {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in with your Participant ID.',
  });
}

export function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId && req.session.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Administrator privileges required.',
  });
}

