const { query } = require('../config/database');
const { ApiError } = require('../middlewares/errorHandler');
const { 
  formatDateTime, 
  getClientIP, 
  getUserAgent,
  validateReportRequest 
} = require('../utils');
const logger = require('../utils/logger');

/**
 * Submit URL report
 * POST /api/shorty-url/report
 */
const submitReport = async (req, res) => {
  // Validate request
  validateReportRequest(req.body);
  
  const { email, shorty, detail } = req.body;
  const timestamp = formatDateTime();
  const clientIP = getClientIP(req);
  const userAgent = getUserAgent(req);

  // Check if the shorty URL exists
  const existingUrl = await query(
    `SELECT id, main_url, short_url 
     FROM shorty_url 
     WHERE short_url = ? 
     LIMIT 1`,
    [shorty]
  );

  if (existingUrl.length === 0) {
    throw new ApiError(404, 'Shorty URL not found');
  }

  const urlData = existingUrl[0];

  // Check for duplicate reports from same IP
  const existingReport = await query(
    `SELECT id 
     FROM shorty_report 
     WHERE shorty_url = ? AND user_ip = ? AND time_report >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
     LIMIT 1`,
    [shorty, clientIP]
  );

  if (existingReport.length > 0) {
    throw new ApiError(409, 'You have already reported this URL recently');
  }

  // Insert report (using AUTO_INCREMENT)
  await query(
    `INSERT INTO shorty_report (user_email, shorty_url, url_id, report_details, time_report, user_ip, user_agent, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [email, shorty, urlData.id, detail, timestamp, clientIP, userAgent, 'pending']
  );

  // Count reports for this URL
  const reportCount = await query(
    `SELECT COUNT(*) AS count FROM shorty_report WHERE shorty_url = ?`,
    [shorty]
  );

  // Auto-flag URL if it has multiple reports (threshold: 3)
  if (reportCount[0].count >= 3) {
    await query(
      `UPDATE shorty_url SET flagged = 1 WHERE id = ?`,
      [urlData.id]
    );
    logger.warn('URL auto-flagged due to multiple reports', { shortUrl: shorty, reportCount: reportCount[0].count });
  }

  logger.info('Report submitted', { shortUrl: shorty, email, ip: clientIP });

  res.status(201).json({
    status: 201,
    message: 'Report submitted successfully. Thank you for helping keep our platform safe.',
  });
};

/**
 * Get report status (for user tracking)
 * GET /api/shorty-url/report/status/:reportId
 */
const getReportStatus = async (req, res) => {
  const { reportId } = req.params;
  const clientIP = getClientIP(req);

  const report = await query(
    `SELECT id, shorty_url, status, time_report 
     FROM shorty_report 
     WHERE id = ? AND user_ip = ?
     LIMIT 1`,
    [reportId, clientIP]
  );

  if (report.length === 0) {
    throw new ApiError(404, 'Report not found');
  }

  res.json({
    status: 200,
    data: report[0],
  });
};

module.exports = {
  submitReport,
  getReportStatus,
};
