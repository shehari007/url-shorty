const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool with promise support
const pool = mysql.createPool({
  host: process.env.DBHOST,
  port: process.env.DBPORT || 3306,
  user: process.env.DBUSERNAME,
  password: process.env.DBPASS,
  database: process.env.DBNAME,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: process.env.NODE_ENV === 'production' ? {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  } : undefined
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Helper function to execute queries
const query = async (sql, params = []) => {
  const [results] = await pool.execute(sql, params);
  return results;
};

// Transaction helper
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection
};
