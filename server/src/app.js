require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');

// Import configuration
const { testConnection } = require('./config/database');
const { PORT, CORS: corsConfig } = require('./config/constants');

// Import middlewares
const {
  securityMiddleware,
  apiLimiter,
  sanitizeBody,
  requestLogger,
  notFoundHandler,
  errorHandler,
} = require('./middlewares');

// Import routes
const { apiRoutes, redirectRoutes } = require('./routes');

// Import logger
const logger = require('./utils/logger');

// Initialize Express app
const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ============================================
// GLOBAL MIDDLEWARES
// ============================================

// Security headers (helmet)
app.use(securityMiddleware);

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Check against allowed origins
    if (corsConfig.ORIGINS.includes(origin) || corsConfig.ORIGINS.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: corsConfig.METHODS,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request sanitization
app.use(sanitizeBody);

// Request logging
// app.use(requestLogger);

// ============================================
// ROUTES
// ============================================

// Health check (no rate limiting)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
app.use('/api/shorty-url', apiLimiter, apiRoutes);

// Redirect routes (short URL resolution)
// Support both /co/:params and /:params for flexibility
app.use('/co', redirectRoutes);
app.use('/', redirectRoutes);  // Root-level redirect for direct short URLs

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API Base: http://localhost:${PORT}/api/shorty-url`);
      logger.info(`🔗 Redirect Base: http://localhost:${PORT}/`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app; // Export for testing
