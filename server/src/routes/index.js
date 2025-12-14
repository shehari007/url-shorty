const express = require('express');
const router = express.Router();

// Import all route modules
const generateRoutes = require('./generateRoutes');
const redirectRoutes = require('./redirectRoutes');
const statsRoutes = require('./statsRoutes');
const perLinkStatsRoutes = require('./perLinkStatsRoutes');
const contactRoutes = require('./contactRoutes');
const reportRoutes = require('./reportRoutes');

// Import unified API controller
const { ApiController } = require('../controllers');
const { asyncHandler, apiLimiter } = require('../middlewares');

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================
// UNIFIED API ENDPOINT (NEW)
// ============================================
// Single endpoint for all actions
router.post('/', apiLimiter, asyncHandler(ApiController.handleAction));

// ============================================
// LEGACY ROUTES (kept for backward compatibility)
// ============================================
router.use('/generate', generateRoutes);
router.use('/stats', statsRoutes);
router.use('/perlinkstats', perLinkStatsRoutes);
router.use('/contact', contactRoutes);
router.use('/report', reportRoutes);

module.exports = {
  apiRoutes: router,
  redirectRoutes,
};
