const { customAlphabet } = require('nanoid');
const { NANOID_ALPHABET, PARAM_LENGTH, SHORT_URL_BASE } = require('../config/constants');

// Create nanoid generator
const generateId = customAlphabet(NANOID_ALPHABET, PARAM_LENGTH);

/**
 * Generate a short URL
 */
const generateShortUrl = () => {
  const shortCode = generateId();
  return {
    code: shortCode,
    fullUrl: `${SHORT_URL_BASE}${shortCode}`,
  };
};

/**
 * Extract short code from full short URL
 */
const extractShortCode = (shortUrl) => {
  if (!shortUrl) return null;
  const match = shortUrl.match(/([a-zA-Z0-9]{5})$/);
  return match ? match[1] : null;
};

/**
 * Format timestamp to MySQL datetime format
 */
const formatDateTime = (date = new Date()) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Get client IP from request
 * Handles various proxy headers including Vercel, Cloudflare, and standard proxies
 */
const getClientIP = (req) => {
  // Vercel-specific header (most reliable on Vercel)
  const vercelForwardedFor = req.headers['x-vercel-forwarded-for'];
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // Standard forwarded-for header (used by most proxies)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  // Cloudflare header
  const cfConnectingIP = req.headers['cf-connecting-ip'];
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Real IP header (used by some proxies like nginx)
  const xRealIP = req.headers['x-real-ip'];
  if (xRealIP) {
    return xRealIP;
  }

  // Fallback to Express req.ip (respects trust proxy setting)
  if (req.ip && req.ip !== '127.0.0.1' && req.ip !== '::1') {
    return req.ip;
  }

  // Last resort: direct connection
  return req.connection?.remoteAddress 
    || req.socket?.remoteAddress 
    || 'unknown';
};

/**
 * Get user agent from request (truncated)
 */
const getUserAgent = (req, maxLength = 255) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  return userAgent.slice(0, maxLength);
};

/**
 * Calculate time difference in human readable format
 */
const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
    }
  }
  
  return 'just now';
};

module.exports = {
  generateShortUrl,
  extractShortCode,
  formatDateTime,
  getClientIP,
  getUserAgent,
  timeAgo,
};
