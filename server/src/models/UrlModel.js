const { query } = require('../config/database');
const { formatDateTime } = require('../utils/helpers');

class UrlModel {
  /**
   * Find URL by main URL
   */
  static async findByMainUrl(mainUrl) {
    const result = await query(
      `SELECT id, short_url, blacklisted, expired_status 
       FROM shorty_url 
       WHERE main_url = ? 
       LIMIT 1`,
      [mainUrl]
    );
    return result[0] || null;
  }

  /**
   * Find URL by short URL
   */
  static async findByShortUrl(shortUrl) {
    const result = await query(
      `SELECT id, main_url, short_url, expired_status, blacklisted, times_clicked, time_issued 
       FROM shorty_url 
       WHERE short_url = ? 
       LIMIT 1`,
      [shortUrl]
    );
    return result[0] || null;
  }

  /**
   * Create new short URL
   */
  static async create({ mainUrl, shortUrl, ip, userAgent }) {
    const timestamp = formatDateTime();
    const result = await query(
      `INSERT INTO shorty_url (main_url, short_url, expired_status, req_ip, req_agent, time_issued, times_clicked, blacklisted)
       VALUES (?, ?, 0, ?, ?, ?, 0, 0)`,
      [mainUrl, shortUrl, ip, userAgent, timestamp]
    );
    return result.insertId;
  }

  /**
   * Increment click count
   */
  static async incrementClicks(id) {
    await query(
      `UPDATE shorty_url SET times_clicked = times_clicked + 1 WHERE id = ?`,
      [id]
    );
  }

  /**
   * Get overall statistics
   */
  static async getOverallStats() {
    const result = await query(
      `SELECT 
        COUNT(*) AS total_shorty,
        COALESCE(SUM(times_clicked), 0) AS total_clicked,
        COUNT(CASE WHEN blacklisted = 1 THEN 1 END) AS total_blacklisted,
        COUNT(CASE WHEN expired_status = 1 THEN 1 END) AS total_expired,
        COUNT(CASE WHEN DATE(time_issued) = CURDATE() THEN 1 END) AS created_today
       FROM shorty_url`
    );
    return result[0];
  }

  /**
   * Get weekly statistics
   */
  static async getWeeklyStats() {
    return await query(
      `SELECT 
        DATE(time_issued) AS date,
        COUNT(*) AS urls_created,
        SUM(times_clicked) AS total_clicks
       FROM shorty_url 
       WHERE time_issued >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(time_issued)
       ORDER BY date DESC`
    );
  }

  /**
   * Get recent URLs
   */
  static async getRecent(limit = 10) {
    return await query(
      `SELECT short_url, times_clicked, time_issued 
       FROM shorty_url 
       WHERE blacklisted = 0 AND expired_status = 0
       ORDER BY time_issued DESC 
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Get top performing URLs
   */
  static async getTopPerforming(limit = 10) {
    return await query(
      `SELECT short_url, main_url, times_clicked, time_issued 
       FROM shorty_url 
       WHERE blacklisted = 0 AND expired_status = 0
       ORDER BY times_clicked DESC 
       LIMIT ?`,
      [limit]
    );
  }
}

module.exports = UrlModel;
