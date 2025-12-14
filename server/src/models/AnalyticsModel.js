const { query } = require('../config/database');
const { formatDateTime } = require('../utils/helpers');

class AnalyticsModel {
  /**
   * Track an event
   */
  static async trackEvent({ eventType, eventData, ip, userAgent }) {
    const timestamp = formatDateTime();
    try {
      await query(
        `INSERT INTO shorty_analytics (event_type, event_data, event_ip, event_agent, event_time)
         VALUES (?, ?, ?, ?, ?)`,
        [eventType, eventData, ip, userAgent, timestamp]
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get event count by type
   */
  static async getCountByType(eventType) {
    try {
      const result = await query(
        `SELECT COUNT(*) AS count FROM shorty_analytics WHERE event_type = ?`,
        [eventType]
      );
      return result[0].count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Increment QR count on URL
   */
  static async incrementQrCount(shortUrl) {
    try {
      await query(
        `UPDATE shorty_url SET qr_generated = COALESCE(qr_generated, 0) + 1 WHERE short_url = ?`,
        [shortUrl]
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get hourly distribution (last 24 hours)
   */
  static async getHourlyDistribution() {
    try {
      return await query(
        `SELECT 
          HOUR(visited_at) AS hour,
          COUNT(*) AS visits
         FROM shorty_visits 
         WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         GROUP BY HOUR(visited_at)
         ORDER BY hour`
      );
    } catch (error) {
      return [];
    }
  }
}

module.exports = AnalyticsModel;
