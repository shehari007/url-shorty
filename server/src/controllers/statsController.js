const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get overall shorty statistics
 * GET /api/shorty-url/stats
 */
const getOverallStats = async (req, res) => {
  // Use COUNT(*) instead of MAX(id) for accurate count
  const result = await query(
    `SELECT 
      COUNT(*) AS total_shorty,
      COALESCE(SUM(times_clicked), 0) AS total_clicked,
      COUNT(CASE WHEN blacklisted = 1 THEN 1 END) AS total_blacklisted,
      COUNT(CASE WHEN expired_status = 1 THEN 1 END) AS total_expired,
      COUNT(CASE WHEN DATE(time_issued) = CURDATE() THEN 1 END) AS created_today,
      (SELECT COUNT(*) FROM shorty_visits WHERE DATE(visited_at) = CURDATE()) AS visits_today,
      (SELECT COUNT(*) FROM shorty_analytics WHERE event_type = 'qr_generated') AS total_qr_generated
     FROM shorty_url`
  );

  // Get recent activity (last 7 days)
  const weeklyStats = await query(
    `SELECT 
      DATE(time_issued) AS date,
      COUNT(*) AS urls_created,
      SUM(times_clicked) AS total_clicks
     FROM shorty_url 
     WHERE time_issued >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY DATE(time_issued)
     ORDER BY date DESC`
  );

  logger.info('Stats retrieved successfully');

  res.json({
    status: 200,
    data: {
      overview: result[0],
      weeklyStats,
    },
  });
};

/**
 * Get per-link statistics
 * POST /api/shorty-url/perlinkstats
 */
const getPerLinkStats = async (req, res) => {
  const { urlValue } = req.body;

  if (!urlValue) {
    return res.status(400).json({
      status: 400,
      error: 'Shorty URL is required',
    });
  }

  // Get link details
  const linkResult = await query(
    `SELECT 
      id, main_url, short_url, expired_status, 
      times_clicked, time_issued, blacklisted
     FROM shorty_url 
     WHERE short_url = ? 
     LIMIT 1`,
    [urlValue]
  );

  if (linkResult.length === 0) {
    return res.status(404).json({
      status: 404,
      error: 'Shorty link not found',
    });
  }

  const link = linkResult[0];

  // Get detailed visit statistics
  const visitStats = await query(
    `SELECT 
      COUNT(*) AS total_visits,
      COUNT(DISTINCT visitor_ip) AS unique_visitors,
      COUNT(CASE WHEN DATE(visited_at) = CURDATE() THEN 1 END) AS visits_today,
      COUNT(CASE WHEN visited_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) AS visits_last_week
     FROM shorty_visits 
     WHERE url_id = ?`,
    [link.id]
  );

  // Get visits by day (last 30 days)
  const dailyVisits = await query(
    `SELECT 
      DATE(visited_at) AS date,
      COUNT(*) AS visits
     FROM shorty_visits 
     WHERE url_id = ? AND visited_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY DATE(visited_at)
     ORDER BY date DESC`,
    [link.id]
  );

  // Get top referers
  const topReferers = await query(
    `SELECT 
      COALESCE(referer, 'Direct') AS referer,
      COUNT(*) AS count
     FROM shorty_visits 
     WHERE url_id = ?
     GROUP BY referer
     ORDER BY count DESC
     LIMIT 10`,
    [link.id]
  );

  logger.info('Per-link stats retrieved', { shortUrl: urlValue });

  res.json({
    status: 200,
    data: {
      link: {
        mainUrl: link.main_url,
        shortUrl: link.short_url,
        expiredStatus: link.expired_status,
        timesClicked: link.times_clicked,
        timeIssued: link.time_issued,
        blacklisted: link.blacklisted,
      },
      visitStats: visitStats[0],
      dailyVisits,
      topReferers,
    },
  });
};

/**
 * Get dashboard statistics
 * GET /api/shorty-url/dashboard
 */
const getDashboardStats = async (req, res) => {
  // Recent URLs
  const recentUrls = await query(
    `SELECT short_url, times_clicked, time_issued 
     FROM shorty_url 
     WHERE blacklisted = 0 AND expired_status = 0
     ORDER BY time_issued DESC 
     LIMIT 10`
  );

  // Top performing URLs
  const topUrls = await query(
    `SELECT short_url, main_url, times_clicked, time_issued 
     FROM shorty_url 
     WHERE blacklisted = 0 AND expired_status = 0
     ORDER BY times_clicked DESC 
     LIMIT 10`
  );

  // Hourly distribution (last 24 hours)
  const hourlyDistribution = await query(
    `SELECT 
      HOUR(visited_at) AS hour,
      COUNT(*) AS visits
     FROM shorty_visits 
     WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
     GROUP BY HOUR(visited_at)
     ORDER BY hour`
  );

  res.json({
    status: 200,
    data: {
      recentUrls,
      topUrls,
      hourlyDistribution,
    },
  });
};

/**
 * Track QR code generation
 * POST /api/shorty-url/track-qr
 */
const trackQrGenerated = async (req, res) => {
  const { shortUrl } = req.body;
  const { formatDateTime, getClientIP, getUserAgent } = require('../utils/helpers');
  
  if (!shortUrl) {
    return res.status(400).json({
      status: 400,
      error: 'Short URL is required',
    });
  }

  const timestamp = formatDateTime();
  const clientIP = getClientIP(req);
  const userAgent = getUserAgent(req);

  // Track QR generation event
  await query(
    `INSERT INTO shorty_analytics (event_type, event_data, event_ip, event_agent, event_time)
     VALUES (?, ?, ?, ?, ?)`,
    ['qr_generated', shortUrl, clientIP, userAgent, timestamp]
  );

  // Update QR count on the URL if tracking field exists
  try {
    await query(
      `UPDATE shorty_url SET qr_generated = COALESCE(qr_generated, 0) + 1 WHERE short_url = ?`,
      [shortUrl]
    );
  } catch (error) {
    // Column might not exist yet, that's okay
    logger.debug('QR count update skipped - column may not exist');
  }

  logger.info('QR generation tracked', { shortUrl });

  res.json({
    status: 200,
    message: 'QR generation tracked',
  });
};

module.exports = {
  getOverallStats,
  getPerLinkStats,
  getDashboardStats,
  trackQrGenerated,
};
