/**
 * Database Initialization Script
 * Creates all required tables for Shorty URL
 * 
 * Usage: node scripts/init-db.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const createTables = async () => {
  console.log('🚀 Starting database initialization...\n');

  // Create connection without database first
  const connection = await mysql.createConnection({
    host: process.env.DBHOST,
    port: process.env.DBPORT || 3306,
    user: process.env.DBUSERNAME,
    password: process.env.DBPASS,
    ssl: process.env.NODE_ENV === 'production' ? {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    } : undefined
  });

  try {
    // Create database if not exists
    const dbName = process.env.DBNAME;
    console.log(`📦 Creating database "${dbName}" if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${dbName}\``);
    console.log(`✅ Database "${dbName}" ready\n`);

    // Table: shorty_url - Main URL storage
    console.log('📋 Creating table: shorty_url...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shorty_url (
        id INT AUTO_INCREMENT PRIMARY KEY,
        main_url TEXT NOT NULL,
        short_url VARCHAR(50) NOT NULL UNIQUE,
        expired_status TINYINT(1) DEFAULT 0,
        blacklisted TINYINT(1) DEFAULT 0,
        times_clicked INT DEFAULT 0,
        qr_generated INT DEFAULT 0,
        req_ip VARCHAR(45),
        req_agent TEXT,
        time_issued DATETIME NOT NULL,
        INDEX idx_short_url (short_url),
        INDEX idx_time_issued (time_issued),
        INDEX idx_blacklisted (blacklisted)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table shorty_url created\n');

    // Table: shorty_visits - Visit tracking
    console.log('📋 Creating table: shorty_visits...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shorty_visits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        url_id INT NOT NULL,
        visitor_ip VARCHAR(45),
        visitor_agent TEXT,
        referer TEXT,
        visited_at DATETIME NOT NULL,
        INDEX idx_url_id (url_id),
        INDEX idx_visited_at (visited_at),
        INDEX idx_visitor_ip (visitor_ip),
        FOREIGN KEY (url_id) REFERENCES shorty_url(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table shorty_visits created\n');

    // Table: shorty_contact - Contact form submissions
    console.log('📋 Creating table: shorty_contact...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shorty_contact (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fullname VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        user_ip VARCHAR(45),
        user_agent TEXT,
        time_sent DATETIME NOT NULL,
        status ENUM('pending', 'read', 'replied', 'archived') DEFAULT 'pending',
        INDEX idx_email (email),
        INDEX idx_time_sent (time_sent),
        INDEX idx_status (status),
        INDEX idx_user_ip (user_ip)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table shorty_contact created\n');

    // Table: shorty_report - URL abuse reports
    console.log('📋 Creating table: shorty_report...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shorty_report (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        shorty_url VARCHAR(20) NOT NULL,
        url_id INT,
        report_details TEXT,
        time_report DATETIME NOT NULL,
        user_ip VARCHAR(45),
        user_agent TEXT,
        status ENUM('pending', 'reviewed', 'actioned', 'dismissed') DEFAULT 'pending',
        INDEX idx_shorty_url (shorty_url),
        INDEX idx_time_report (time_report),
        INDEX idx_status (status),
        INDEX idx_user_ip (user_ip),
        FOREIGN KEY (url_id) REFERENCES shorty_url(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table shorty_report created\n');

    // Table: shorty_analytics - Event tracking
    console.log('📋 Creating table: shorty_analytics...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shorty_analytics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        event_data TEXT,
        event_ip VARCHAR(45),
        event_agent TEXT,
        event_time DATETIME NOT NULL,
        INDEX idx_event_type (event_type),
        INDEX idx_event_time (event_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table shorty_analytics created\n');

    console.log('🎉 All tables created successfully!\n');
    console.log('Database Schema:');
    console.log('─────────────────────────────────────');
    console.log('• shorty_url       - Stores shortened URLs');
    console.log('• shorty_visits    - Tracks link visits');
    console.log('• shorty_contact   - Contact form submissions');
    console.log('• shorty_report    - URL abuse reports');
    console.log('• shorty_analytics - Event tracking');
    console.log('─────────────────────────────────────\n');

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
createTables()
  .then(() => {
    console.log('\n✅ Database initialization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Database initialization failed:', error);
    process.exit(1);
  });
