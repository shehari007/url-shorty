const { query } = require('../config/database');
const { formatDateTime } = require('../utils/helpers');

class VisitModel {
  /**
   * Track a visit
   */
  static async create({ urlId, ip, userAgent, referer }) {
    const timestamp = formatDateTime();
    try {
      await query(
        `INSERT INTO shorty_visits (url_id, visitor_ip, visitor_agent, referer, visited_at)
         VALUES (?, ?, ?, ?, ?)`,
        [urlId, ip, userAgent, referer, timestamp]
      );
      return true;
    } catch (error) {
      // Table might not exist yet
      return false;
    }
  }

  /**
   * Get visit stats for a URL
   */
  static async getStatsForUrl(urlId) {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) AS total_visits,
          COUNT(DISTINCT visitor_ip) AS unique_visitors,
          COUNT(CASE WHEN DATE(visited_at) = CURDATE() THEN 1 END) AS visits_today,
          COUNT(CASE WHEN visited_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) AS visits_last_week
         FROM shorty_visits 
         WHERE url_id = ?`,
        [urlId]
      );
      return result[0];
    } catch (error) {
      return { total_visits: 0, unique_visitors: 0, visits_today: 0, visits_last_week: 0 };
    }
  }

  /**
   * Get daily visits for a URL
   */
  static async getDailyVisits(urlId, days = 30) {
    try {
      return await query(
        `SELECT 
          DATE(visited_at) AS date,
          COUNT(*) AS visits
         FROM shorty_visits 
         WHERE url_id = ? AND visited_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY DATE(visited_at)
         ORDER BY date DESC`,
        [urlId, days]
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * Get top referers for a URL
   */
  static async getTopReferers(urlId, limit = 10) {
    try {
      return await query(
        `SELECT 
          COALESCE(referer, 'Direct') AS referer,
          COUNT(*) AS count
         FROM shorty_visits 
         WHERE url_id = ?
         GROUP BY referer
         ORDER BY count DESC
         LIMIT ?`,
        [urlId, limit]
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * Get today's visit count
   */
  static async getTodayCount() {
    try {
      const result = await query(
        `SELECT COUNT(*) AS count FROM shorty_visits WHERE DATE(visited_at) = CURDATE()`
      );
      return result[0].count;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = VisitModel;
