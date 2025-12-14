const express = require('express');
const router = express.Router();
const { statsController } = require('../controllers');
const { asyncHandler, apiLimiter } = require('../middlewares');

/**
 * @route   POST /api/shorty-url/perlinkstats
 * @desc    Get statistics for a specific link
 * @access  Public
 */
router.post('/', apiLimiter, asyncHandler(statsController.getPerLinkStats));

module.exports = router;
