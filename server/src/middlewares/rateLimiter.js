const rateLimit = require('express-rate-limit');
const { RATE_LIMIT } = require('../config/constants');
const { htmlTemplates, getClientIP } = require('../utils');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
  message: {
    status: 429,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIP(req),
});

// Stricter limiter for URL generation
const generateLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.GENERATE_MAX,
  message: {
    status: 429,
    error: 'URL generation limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIP(req),
});

// Report submission limiter
const reportLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.REPORT_MAX,
  message: {
    status: 429,
    error: 'Report submission limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIP(req),
});

// Contact form limiter
const contactLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.CONTACT_MAX,
  message: {
    status: 429,
    error: 'Contact form submission limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIP(req),
});

// Redirect limiter (more lenient) - returns HTML page
const redirectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  handler: (req, res) => {
    res.status(429).send(htmlTemplates.rateLimitedPage());
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIP(req),
});

module.exports = {
  apiLimiter,
  generateLimiter,
  reportLimiter,
  contactLimiter,
  redirectLimiter,
};
