const { query } = require('../config/database');
const { ApiError } = require('../middlewares/errorHandler');
const { SHORT_URL_BASE, LINK_STATUS } = require('../config/constants');
const { 
  generateShortUrl, 
  formatDateTime, 
  getClientIP, 
  getUserAgent,
  validateGenerateRequest 
} = require('../utils');
const logger = require('../utils/logger');

/**
 * Generate a new short URL
 * POST /api/shorty-url/generate
 */
const generateUrl = async (req, res) => {
  // Validate request
  validateGenerateRequest(req.body);
  
  const { urlValue } = req.body;
  const clientIP = getClientIP(req);
  const userAgent = getUserAgent(req);
  const timestamp = formatDateTime();

  // Check if URL already exists and is not blacklisted
  const existingUrl = await query(
    `SELECT short_url, blacklisted, expired_status 
     FROM shorty_url 
     WHERE main_url = ? 
     LIMIT 1`,
    [urlValue]
  );

  if (existingUrl.length > 0) {
    const existing = existingUrl[0];
    
    if (existing.blacklisted === 1) {
      logger.warn('Blacklisted URL generation attempt', { url: urlValue, ip: clientIP });
      throw new ApiError(403, 'This URL has been blacklisted');
    }
    
    if (existing.expired_status === 0) {
      logger.info('Existing short URL returned', { shortUrl: existing.short_url });
      return res.json({
        status: 200,
        message: existing.short_url,
        isExisting: true,
      });
    }
  }

  // Generate new short URL
  const { fullUrl } = generateShortUrl();

  // Insert new URL (using AUTO_INCREMENT instead of MAX(id))
  await query(
    `INSERT INTO shorty_url (main_url, short_url, expired_status, req_ip, req_agent, time_issued, times_clicked, blacklisted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [urlValue, fullUrl, LINK_STATUS.ACTIVE, clientIP, userAgent, timestamp, 0, 0]
  );

  // Track URL generation in analytics
  await trackAnalytics('url_generated', clientIP, userAgent);

  logger.info('New short URL created', { shortUrl: fullUrl, mainUrl: urlValue });

  res.status(201).json({
    status: 201,
    message: fullUrl,
    isExisting: false,
  });
};

/**
 * Redirect short URL to original URL
 * GET /co/:params
 */
const invokeUrl = async (req, res) => {
  const shortParam = req.shortParam;
  const constructedUrl = `${SHORT_URL_BASE}${shortParam}`;
  const clientIP = getClientIP(req);
  const userAgent = getUserAgent(req);

  // Get URL details
  const result = await query(
    `SELECT id, main_url, expired_status, blacklisted 
     FROM shorty_url 
     WHERE short_url = ? 
     LIMIT 1`,
    [constructedUrl]
  );

  if (result.length === 0) {
    logger.warn('Invalid short URL invoked', { shortUrl: constructedUrl, ip: clientIP });
    throw new ApiError(404, 'Link not found');
  }

  const urlData = result[0];

  if (urlData.expired_status === 1) {
    logger.info('Expired link invoked', { shortUrl: constructedUrl });
    throw new ApiError(410, 'This link has expired');
  }

  if (urlData.blacklisted === 1) {
    logger.warn('Blacklisted link invoked', { shortUrl: constructedUrl, ip: clientIP });
    throw new ApiError(410, 'This link has been blacklisted');
  }

  // Update click count and track visit in parallel
  await Promise.all([
    query(
      `UPDATE shorty_url SET times_clicked = times_clicked + 1 WHERE id = ?`,
      [urlData.id]
    ),
    trackVisit(urlData.id, clientIP, userAgent, req.headers.referer || null),
  ]);

  logger.info('URL redirect successful', { shortUrl: constructedUrl, mainUrl: urlData.main_url });

  res.redirect(307, urlData.main_url);
};

/**
 * Track individual visit details
 */
const trackVisit = async (urlId, ip, userAgent, referer) => {
  const timestamp = formatDateTime();
  
  try {
    await query(
      `INSERT INTO shorty_visits (url_id, visitor_ip, visitor_agent, referer, visited_at)
       VALUES (?, ?, ?, ?, ?)`,
      [urlId, ip, userAgent, referer, timestamp]
    );
  } catch (error) {
    // Log but don't fail the redirect
    logger.error('Failed to track visit', { error: error.message, urlId });
  }
};

/**
 * Track analytics events
 */
const trackAnalytics = async (eventType, ip, userAgent) => {
  const timestamp = formatDateTime();
  
  try {
    await query(
      `INSERT INTO shorty_analytics (event_type, event_ip, event_agent, event_time)
       VALUES (?, ?, ?, ?)`,
      [eventType, ip, userAgent, timestamp]
    );
  } catch (error) {
    // Log but don't fail the main operation
    logger.error('Failed to track analytics', { error: error.message, eventType });
  }
};

module.exports = {
  generateUrl,
  invokeUrl,
  trackVisit,
  trackAnalytics,
};
