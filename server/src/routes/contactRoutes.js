const express = require('express');
const router = express.Router();
const { contactController } = require('../controllers');
const { asyncHandler, contactLimiter } = require('../middlewares');

/**
 * @route   POST /api/shorty-url/contact
 * @desc    Submit contact form
 * @access  Public
 */
router.post('/', contactLimiter, asyncHandler(contactController.submitContact));

module.exports = router;
