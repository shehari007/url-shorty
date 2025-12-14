const { query } = require('../config/database');
const { ApiError } = require('../middlewares/errorHandler');
const { 
  formatDateTime, 
  getClientIP, 
  getUserAgent,
  validateContactRequest 
} = require('../utils');
const logger = require('../utils/logger');

/**
 * Submit contact form
 * POST /api/shorty-url/contact
 */
const submitContact = async (req, res) => {
  // Validate request
  validateContactRequest(req.body);
  
  const { fullname, email, detail } = req.body;
  const timestamp = formatDateTime();
  const clientIP = getClientIP(req);
  const userAgent = getUserAgent(req);

  // Check for spam (same IP submitting multiple times recently)
  const recentSubmissions = await query(
    `SELECT COUNT(*) AS count 
     FROM shorty_contact 
     WHERE user_ip = ? AND time_sent >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
    [clientIP]
  );

  if (recentSubmissions[0].count >= 3) {
    logger.warn('Contact form spam detected', { ip: clientIP, email });
    throw new ApiError(429, 'Too many submissions. Please try again later.');
  }

  // Insert contact message (using AUTO_INCREMENT)
  await query(
    `INSERT INTO shorty_contact (fullname, email, message, user_ip, user_agent, time_sent, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [fullname, email, detail, clientIP, userAgent, timestamp, 'pending']
  );

  logger.info('Contact form submitted', { email, ip: clientIP });

  res.status(201).json({
    status: 201,
    message: 'Your message has been sent successfully. We will get back to you soon.',
  });
};

module.exports = {
  submitContact,
};
