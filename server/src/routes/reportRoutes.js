const express = require('express');
const router = express.Router();
const { reportController } = require('../controllers');
const { asyncHandler, reportLimiter, apiLimiter } = require('../middlewares');

/**
 * @route   POST /api/shorty-url/report
 * @desc    Submit a URL report
 * @access  Public
 */
router.post('/', reportLimiter, asyncHandler(reportController.submitReport));

/**
 * @route   GET /api/shorty-url/report/status/:reportId
 * @desc    Get report status
 * @access  Public (limited to reporter's IP)
 */
router.get('/status/:reportId', apiLimiter, asyncHandler(reportController.getReportStatus));

module.exports = router;
