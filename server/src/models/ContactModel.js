const { query } = require('../config/database');
const { formatDateTime } = require('../utils/helpers');

class ContactModel {
  /**
   * Create a new contact submission
   */
  static async create({ fullname, email, message, ip, userAgent }) {
    const timestamp = formatDateTime();
    const result = await query(
      `INSERT INTO shorty_contact (fullname, email, message, user_ip, user_agent, time_sent, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [fullname, email, message, ip, userAgent, timestamp]
    );
    return result.insertId;
  }

  /**
   * Count recent submissions from an IP
   */
  static async countRecentByIp(ip, hoursAgo = 1) {
    const result = await query(
      `SELECT COUNT(*) AS count 
       FROM shorty_contact 
       WHERE user_ip = ? AND time_sent >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [ip, hoursAgo]
    );
    return result[0].count;
  }

  /**
   * Get all contacts (for admin)
   */
  static async getAll(limit = 50, offset = 0) {
    return await query(
      `SELECT id, fullname, email, message, time_sent, status 
       FROM shorty_contact 
       ORDER BY time_sent DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }

  /**
   * Update contact status
   */
  static async updateStatus(id, status) {
    await query(
      `UPDATE shorty_contact SET status = ? WHERE id = ?`,
      [status, id]
    );
  }
}

module.exports = ContactModel;
