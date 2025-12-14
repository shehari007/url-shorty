const { VALIDATION } = require('../config/constants');
const { ApiError } = require('../middlewares/errorHandler');

// URL validation regex - strict HTTPS only
const URL_REGEX = /^https:\/\/([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}(:[0-9]{1,5})?(\/[^\s]*)?$/;

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
  
  if (!shorty || !isValidURL(shorty)) {
    throw new ApiError(400, 'Valid shorty URL is required');
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
  isValidEmail,
  isValidLength,
  validateGenerateRequest,
  validateContactRequest,
  validateReportRequest,
  validatePerLinkStatsRequest,
};
