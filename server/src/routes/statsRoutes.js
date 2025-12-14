const express = require('express');
const router = express.Router();
const { statsController } = require('../controllers');
const { asyncHandler, apiLimiter } = require('../middlewares');

/**
 * @route   GET /api/shorty-url/stats
 * @desc    Get overall shorty statistics
 * @access  Public
 */
router.get('/', apiLimiter, asyncHandler(statsController.getOverallStats));

/**
 * @route   GET /api/shorty-url/stats/dashboard
 * @desc    Get dashboard statistics
 * @access  Public
 */
router.get('/dashboard', apiLimiter, asyncHandler(statsController.getDashboardStats));

/**
 * @route   POST /api/shorty-url/stats/track-qr
 * @desc    Track QR code generation
 * @access  Public
 */
router.post('/track-qr', apiLimiter, asyncHandler(statsController.trackQrGenerated));

module.exports = router;
