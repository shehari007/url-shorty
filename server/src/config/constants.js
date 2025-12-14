require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // URL Configuration
  SHORT_URL_BASE: process.env.SHORTURLDEF || 'https://shorty.co/',
  PARAM_LENGTH: parseInt(process.env.PARAMLEN) || 5,
  
  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // per window
    GENERATE_MAX: 20, // URL generation limit per window
    REPORT_MAX: 5, // Report submission limit per window
    CONTACT_MAX: 3, // Contact form limit per window
  },
  
  // CORS
  CORS: {
    ORIGINS: process.env.DOMAINS ? process.env.DOMAINS.split(',') : ['http://localhost:3000'],
    METHODS: process.env.METHODS ? process.env.METHODS.split(',') : ['GET', 'POST', 'OPTIONS'],
  },
  
  // Validation
  VALIDATION: {
    MAX_URL_LENGTH: 2048,
    MAX_EMAIL_LENGTH: 254,
    MAX_MESSAGE_LENGTH: 1000,
    MAX_NAME_LENGTH: 100,
    MAX_REPORT_DETAIL_LENGTH: 500,
  },
  
  // Link Status
  LINK_STATUS: {
    ACTIVE: 0,
    EXPIRED: 1,
    BLACKLISTED: 1,
  },
  
  // Nanoid alphabet for URL generation
  NANOID_ALPHABET: '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
};
