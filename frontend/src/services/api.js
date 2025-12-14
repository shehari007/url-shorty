import axios from 'axios';

// API base URL - single endpoint
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/shorty-url';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
    console.error('API Error:', errorMessage);
    return Promise.reject(error);
  }
);

/**
 * Available actions for the unified API
 */
export const ACTIONS = {
  GENERATE: 'generate',
  STATS: 'stats',
  PER_LINK_STATS: 'perLinkStats',
  CONTACT: 'contact',
  REPORT: 'report',
  DASHBOARD: 'dashboard',
  TRACK_QR: 'trackQr',
};

/**
 * Main API call function
 * All requests go through this single endpoint
 */
const callApi = async (action, payload = {}) => {
  const response = await api.post('/', { action, ...payload });
  return response.data;
};

/**
 * API Service object with all methods
 */
const ApiService = {
  /**
   * Generate a short URL
   * @param {string} url - The URL to shorten
   * @returns {Promise<{success: boolean, data: {shortUrl: string, isExisting: boolean}}>}
   */
  generate: async (url) => {
    return callApi(ACTIONS.GENERATE, { url });
  },

  /**
   * Get overall statistics
   * @returns {Promise<{success: boolean, data: {overview: object, weeklyStats: array}}>}
   */
  getStats: async () => {
    return callApi(ACTIONS.STATS);
  },

  /**
   * Get statistics for a specific link
   * @param {string} url - The short URL to get stats for
   * @returns {Promise<{success: boolean, data: {link: object, visitStats: object, dailyVisits: array, topReferers: array}}>}
   */
  getPerLinkStats: async (url) => {
    return callApi(ACTIONS.PER_LINK_STATS, { url });
  },

  /**
   * Submit contact form
   * @param {object} data - Contact form data
   * @param {string} data.fullname - Full name
   * @param {string} data.email - Email address
   * @param {string} data.message - Message content
   * @returns {Promise<{success: boolean, message: string}>}
   */
  submitContact: async ({ fullname, email, message }) => {
    return callApi(ACTIONS.CONTACT, { fullname, email, message });
  },

  /**
   * Submit URL report
   * @param {object} data - Report data
   * @param {string} data.email - Reporter's email
   * @param {string} data.shortyUrl - The short URL being reported
   * @param {string} data.detail - Report details
   * @returns {Promise<{success: boolean, message: string, data: {reportId: number}}>}
   */
  submitReport: async ({ email, shortyUrl, detail }) => {
    return callApi(ACTIONS.REPORT, { email, shortyUrl, detail });
  },

  /**
   * Get dashboard data
   * @returns {Promise<{success: boolean, data: {recentUrls: array, topUrls: array, hourlyDistribution: array}}>}
   */
  getDashboard: async () => {
    return callApi(ACTIONS.DASHBOARD);
  },

  /**
   * Track QR code generation
   * @param {string} shortUrl - The short URL for which QR was generated
   * @returns {Promise<{success: boolean, message: string}>}
   */
  trackQrGeneration: async (shortUrl) => {
    return callApi(ACTIONS.TRACK_QR, { shortUrl });
  },
};

export default ApiService;
