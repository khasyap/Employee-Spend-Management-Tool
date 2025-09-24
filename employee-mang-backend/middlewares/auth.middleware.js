const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const LoginHistory = require('../models/loginHistory.model');
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    // Verify token with proper error handling
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, error: 'User account is deactivated.' });
    }

      // Record successful login
    const loginHistory = new LoginHistory({
      userId: user._id,
      email: user.email,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      success: true
    });
    await loginHistory.save();

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    
    // Record failed login attempt if we have user info
    if (error.name === 'JsonWebTokenError' && error.message.includes('jwt subject invalid')) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.email) {
          const loginHistory = new LoginHistory({
            email: decoded.email,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            success: false,
            failureReason: 'Invalid token'
          });
          await loginHistory.save();
        }
      } catch (err) {
        console.error('Error recording failed login:', err);
      }
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired.' });
    }
    
    res.status(401).json({ success: false, error: 'Token is not valid.' });
  }
};

module.exports = authMiddleware;