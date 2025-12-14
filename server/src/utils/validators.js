const { VALIDATION, SHORT_URL_BASE } = require('../config/constants');
const { ApiError } = require('../middlewares/errorHandler');

// URL validation regex - strict HTTPS only
const URL_REGEX = /^https:\/\/([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}(:[0-9]{1,5})?(\/[^\s]*)?$/;

// Shorty URL validation regex - more permissive for our own URLs
// Matches URLs like https://shorty.co/abc123 or http://localhost:8080/abc123
const SHORTY_URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validate URL format (must be HTTPS)
 */
const isValidURL = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.length > VALIDATION.MAX_URL_LENGTH) return false;
  return URL_REGEX.test(url);
};

/**
 * Validate Shorty URL format (must match configured SHORT_URL_BASE domain)
 */
const isValidShortyURL = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.length > VALIDATION.MAX_URL_LENGTH) return false;
  
  // Check if URL starts with the configured SHORT_URL_BASE
  if (!url.startsWith(SHORT_URL_BASE)) {
    return false;
  }
  
  // Check that there's a short code after the base URL
  const shortCode = url.slice(SHORT_URL_BASE.length);
  if (!shortCode || shortCode.length === 0 || shortCode.includes('/')) {
    return false;
  }
  
  return true;
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  if (email.length > VALIDATION.MAX_EMAIL_LENGTH) return false;
  return EMAIL_REGEX.test(email);
};

/**
 * Validate string length
 */
const isValidLength = (str, min, max) => {
  if (!str || typeof str !== 'string') return false;
  const length = str.trim().length;
  return length >= min && length <= max;
};

/**
 * Validate URL generation request
 */
const validateGenerateRequest = (body) => {
  const { urlValue } = body;
  
  if (!urlValue) {
    throw new ApiError(400, 'URL is required');
  }
  
  if (!urlValue.startsWith('https://')) {
    throw new ApiError(400, 'Only HTTPS URLs are allowed');
  }
  
  // Prevent shortening shorty URLs themselves
  if (urlValue.startsWith(SHORT_URL_BASE)) {
    throw new ApiError(400, 'Cannot shorten a Shorty URL');
  }
  
  if (!isValidURL(urlValue)) {
    throw new ApiError(400, 'Invalid URL format');
  }
  
  if (urlValue.length > VALIDATION.MAX_URL_LENGTH) {
    throw new ApiError(400, `URL exceeds maximum length of ${VALIDATION.MAX_URL_LENGTH} characters`);
  }
  
  return true;
};

/**
 * Validate contact form request
 */
const validateContactRequest = (body) => {
  const { fullname, email, detail } = body;
  
  if (!fullname || !isValidLength(fullname, 2, VALIDATION.MAX_NAME_LENGTH)) {
    throw new ApiError(400, 'Valid name is required (2-100 characters)');
  }
  
  if (!email || !isValidEmail(email)) {
    throw new ApiError(400, 'Valid email is required');
  }
  
  if (!detail || !isValidLength(detail, 10, VALIDATION.MAX_MESSAGE_LENGTH)) {
    throw new ApiError(400, 'Message must be between 10-1000 characters');
  }
  
  return true;
};

/**
 * Validate report request
 */
const validateReportRequest = (body) => {
  const { email, shorty, detail } = body;
  
  if (!email || !isValidEmail(email)) {
    throw new ApiError(400, 'Valid email is required');
  }
  
  if (!shorty || typeof shorty !== 'string' || shorty.trim().length === 0) {
    throw new ApiError(400, 'Please enter the Shorty URL');
  }
  
  // Validate shorty URL matches configured domain
  if (!isValidShortyURL(shorty)) {
    throw new ApiError(400, `Please enter a valid Shorty URL (e.g., ${SHORT_URL_BASE}abc123)`);
  }
  
  if (!detail || !isValidLength(detail, 10, VALIDATION.MAX_REPORT_DETAIL_LENGTH)) {
    throw new ApiError(400, 'Report detail must be between 10-500 characters');
  }
  
  return true;
};

/**
 * Validate per-link stats request
 */
const validatePerLinkStatsRequest = (body) => {
  const { urlValue } = body;
  
  if (!urlValue) {
    throw new ApiError(400, 'Shorty URL is required');
  }
  
  if (!isValidURL(urlValue)) {
    throw new ApiError(400, 'Invalid shorty URL format');
  }
  
  return true;
};

module.exports = {
  isValidURL,
  isValidShortyURL,
  isValidEmail,
  isValidLength,
  validateGenerateRequest,
  validateContactRequest,
  validateReportRequest,
  validatePerLinkStatsRequest,
};
