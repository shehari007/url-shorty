const { PARAM_LENGTH } = require('../config/constants');
const { ApiError } = require('./errorHandler');

// Validate short URL parameter in redirect routes
const validateShortParam = (req, res, next) => {
  const { params } = req.params;
  
  if (!params) {
    throw new ApiError(400, 'Missing URL parameter');
  }
  
  if (params.length !== PARAM_LENGTH) {
    throw new ApiError(400, 'Invalid link format');
  }
  
  // Check for valid characters (alphanumeric only)
  if (!/^[a-zA-Z0-9]+$/.test(params)) {
    throw new ApiError(400, 'Invalid link characters');
  }
  
  req.shortParam = params;
  next();
};

// Sanitize string input
const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .slice(0, 10000); // Limit max length
};

// Recursively sanitize request body
const sanitizeBody = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return sanitizeInput(obj);
    }
    
    const sanitized = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeInput(key)] = sanitize(value);
    }
    return sanitized;
  };
  
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 100),
    };
    
    if (res.statusCode >= 400) {
      console.warn('Request Warning:', log);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('Request:', log);
    }
  });
  
  next();
};

module.exports = {
  validateShortParam,
  sanitizeBody,
  requestLogger,
};
