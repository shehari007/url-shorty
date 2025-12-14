const express = require('express');
const router = express.Router();
const { urlController } = require('../controllers');
const { asyncHandler, generateLimiter } = require('../middlewares');

/**
 * @route   POST /api/shorty-url/generate
 * @desc    Generate a new short URL
 * @access  Public
 */
router.post('/', generateLimiter, asyncHandler(urlController.generateUrl));

module.exports = router;
