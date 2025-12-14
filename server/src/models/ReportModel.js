const { query } = require('../config/database');
const { formatDateTime } = require('../utils/helpers');

class ReportModel {
  /**
   * Create a new report
   */
  static async create({ email, shortyUrl, urlId, detail, ip, userAgent }) {
    const timestamp = formatDateTime();
    const result = await query(
      `INSERT INTO shorty_report (user_email, shorty_url, url_id, report_details, time_report, user_ip, user_agent, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [email, shortyUrl, urlId, detail, timestamp, ip, userAgent]
    );
    return result.insertId;
  }

  /**
   * Check for duplicate report from same IP
   */
  static async findRecentByIpAndUrl(shortyUrl, ip, hoursAgo = 24) {
    const result = await query(
      `SELECT id 
       FROM shorty_report 
       WHERE shorty_url = ? AND user_ip = ? AND time_report >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       LIMIT 1`,
      [shortyUrl, ip, hoursAgo]
    );
    return result[0] || null;
  }

  /**
   * Count reports for a URL
   */
  static async countByUrl(shortyUrl) {
    const result = await query(
      `SELECT COUNT(*) AS count FROM shorty_report WHERE shorty_url = ?`,
      [shortyUrl]
    );
    return result[0].count;
  }

  /**
   * Get report by ID and IP (for user tracking)
   */
  static async findByIdAndIp(id, ip) {
    const result = await query(
      `SELECT id, shorty_url, status, time_report 
       FROM shorty_report 
       WHERE id = ? AND user_ip = ?
       LIMIT 1`,
      [id, ip]
    );
    return result[0] || null;
  }

  /**
   * Flag URL after multiple reports
   */
  static async flagUrl(urlId) {
    await query(
      `UPDATE shorty_url SET flagged = 1 WHERE id = ?`,
      [urlId]
    );
  }
}

module.exports = ReportModel;
