const express = require('express');
const router = express.Router();
const { ApiController } = require('../controllers');
const { asyncHandler, validateShortParam, redirectLimiter } = require('../middlewares');

/**
 * @route   GET /co/:params
 * @desc    Redirect short URL to original URL
 * @access  Public
 */
router.get('/:params', redirectLimiter, validateShortParam, asyncHandler(ApiController.handleRedirect));

module.exports = router;
