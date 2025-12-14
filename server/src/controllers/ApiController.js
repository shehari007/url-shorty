const { UrlModel, VisitModel, ContactModel, ReportModel, AnalyticsModel } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { SHORT_URL_BASE } = require('../config/constants');
const { 
  generateShortUrl, 
  getClientIP, 
  getUserAgent,
  validateGenerateRequest,
  validateContactRequest,
  validateReportRequest,
  validatePerLinkStatsRequest,
  isValidURL,
  htmlTemplates,
} = require('../utils');
const logger = require('../utils/logger');

/**
 * Supported actions for the unified API
 */
const ACTIONS = {
  GENERATE: 'generate',
  STATS: 'stats',
  PER_LINK_STATS: 'perLinkStats',
  CONTACT: 'contact',
  REPORT: 'report',
  DASHBOARD: 'dashboard',
  TRACK_QR: 'trackQr',
};

/**
 * Unified API Controller
 * Single endpoint that handles all actions based on 'action' parameter
 * POST /api/shorty
 */
const handleAction = async (req, res) => {
  const { action, ...payload } = req.body;
  const clientIP = getClientIP(req);
  const userAgent = getUserAgent(req);

  if (!action) {
    throw new ApiError(400, 'Action is required');
  }

  switch (action) {
    case ACTIONS.GENERATE:
      return await handleGenerate(req, res, payload, clientIP, userAgent);
    
    case ACTIONS.STATS:
      return await handleStats(req, res);
    
    case ACTIONS.PER_LINK_STATS:
      return await handlePerLinkStats(req, res, payload);
    
    case ACTIONS.CONTACT:
      return await handleContact(req, res, payload, clientIP, userAgent);
    
    case ACTIONS.REPORT:
      return await handleReport(req, res, payload, clientIP, userAgent);
    
    case ACTIONS.DASHBOARD:
      return await handleDashboard(req, res);
    
    case ACTIONS.TRACK_QR:
      return await handleTrackQr(req, res, payload, clientIP, userAgent);
    
    default:
      throw new ApiError(400, `Invalid action: ${action}`);
  }
};

/**
 * Generate short URL
 */
const handleGenerate = async (req, res, payload, clientIP, userAgent) => {
  const { url } = payload;
  
  if (!url) {
    throw new ApiError(400, 'URL is required');
  }

  // Validate URL
  validateGenerateRequest({ urlValue: url });

  // Check if URL already exists
  const existing = await UrlModel.findByMainUrl(url);

  if (existing) {
    if (existing.blacklisted === 1) {
      logger.warn('Blacklisted URL generation attempt', { url, ip: clientIP });
      throw new ApiError(403, 'This URL has been blacklisted');
    }
    
    if (existing.expired_status === 0) {
      logger.info('Existing short URL returned', { shortUrl: existing.short_url });
      
      // Track event
      await AnalyticsModel.trackEvent({
        eventType: 'url_generated',
        eventData: existing.short_url,
        ip: clientIP,
        userAgent,
      });

      return res.json({
        success: true,
        data: {
          shortUrl: existing.short_url,
          isExisting: true,
        },
      });
    }
  }

  // Generate new short URL
  const { fullUrl } = generateShortUrl();

  // Create new URL
  await UrlModel.create({
    mainUrl: url,
    shortUrl: fullUrl,
    ip: clientIP,
    userAgent,
  });

  // Track event
  await AnalyticsModel.trackEvent({
    eventType: 'url_generated',
    eventData: fullUrl,
    ip: clientIP,
    userAgent,
  });

  logger.info('New short URL created', { shortUrl: fullUrl, mainUrl: url });

  res.status(201).json({
    success: true,
    data: {
      shortUrl: fullUrl,
      isExisting: false,
    },
  });
};

/**
 * Get overall statistics
 */
const handleStats = async (req, res) => {
  const overview = await UrlModel.getOverallStats();
  const weeklyStats = await UrlModel.getWeeklyStats();
  const visitsToday = await VisitModel.getTodayCount();
  const totalQrGenerated = await AnalyticsModel.getCountByType('qr_generated');

  logger.info('Stats retrieved');

  res.json({
    success: true,
    data: {
      overview: {
        ...overview,
        visits_today: visitsToday,
        total_qr_generated: totalQrGenerated,
      },
      weeklyStats,
    },
  });
};

/**
 * Get per-link statistics
 */
const handlePerLinkStats = async (req, res, payload) => {
  const { url } = payload;

  if (!url) {
    throw new ApiError(400, 'Shorty URL is required');
  }

  // Find the link
  const link = await UrlModel.findByShortUrl(url);

  if (!link) {
    throw new ApiError(404, 'Shorty link not found');
  }

  // Get visit statistics
  const visitStats = await VisitModel.getStatsForUrl(link.id);
  const dailyVisits = await VisitModel.getDailyVisits(link.id);
  const topReferers = await VisitModel.getTopReferers(link.id);

  logger.info('Per-link stats retrieved', { shortUrl: url });

  res.json({
    success: true,
    data: {
      link: {
        mainUrl: link.main_url,
        shortUrl: link.short_url,
        expiredStatus: link.expired_status,
        timesClicked: link.times_clicked,
        timeIssued: link.time_issued,
        blacklisted: link.blacklisted,
        qrGenerated: link.qr_generated || 0,
      },
      visitStats,
      dailyVisits,
      topReferers,
    },
  });
};

/**
 * Submit contact form
 */
const handleContact = async (req, res, payload, clientIP, userAgent) => {
  const { fullname, email, message } = payload;

  // Validate
  validateContactRequest({ fullname, email, detail: message });

  // Check spam
  const recentCount = await ContactModel.countRecentByIp(clientIP);
  if (recentCount >= 3) {
    logger.warn('Contact spam detected', { ip: clientIP, email });
    throw new ApiError(429, 'Too many submissions. Please try again later.');
  }

  // Create contact
  const id = await ContactModel.create({
    fullname,
    email,
    message,
    ip: clientIP,
    userAgent,
  });

  logger.info('Contact form submitted', { id, email, ip: clientIP });

  res.status(201).json({
    success: true,
    message: 'Your message has been sent successfully. We will get back to you soon.',
  });
};

/**
 * Submit URL report
 */
const handleReport = async (req, res, payload, clientIP, userAgent) => {
  const { email, shortyUrl, detail } = payload;

  // Validate
  validateReportRequest({ email, shorty: shortyUrl, detail });

  // Check if URL exists
  const urlData = await UrlModel.findByShortUrl(shortyUrl);
  if (!urlData) {
    throw new ApiError(404, 'Shorty URL not found');
  }

  // Check for duplicate report
  const existingReport = await ReportModel.findRecentByIpAndUrl(shortyUrl, clientIP);
  if (existingReport) {
    throw new ApiError(409, 'You have already reported this URL recently');
  }

  // Create report
  const reportId = await ReportModel.create({
    email,
    shortyUrl,
    urlId: urlData.id,
    detail,
    ip: clientIP,
    userAgent,
  });

  // Check if URL should be auto-flagged (3+ reports)
  const reportCount = await ReportModel.countByUrl(shortyUrl);
  if (reportCount >= 3) {
    await ReportModel.flagUrl(urlData.id);
    logger.warn('URL auto-flagged', { shortUrl: shortyUrl, reportCount });
  }

  logger.info('Report submitted', { reportId, shortUrl: shortyUrl, email });

  res.status(201).json({
    success: true,
    message: 'Report submitted successfully. Thank you for helping keep our platform safe.',
    data: { reportId },
  });
};

/**
 * Get dashboard data
 */
const handleDashboard = async (req, res) => {
  const recentUrls = await UrlModel.getRecent(10);
  const topUrls = await UrlModel.getTopPerforming(10);
  const hourlyDistribution = await AnalyticsModel.getHourlyDistribution();

  res.json({
    success: true,
    data: {
      recentUrls,
      topUrls,
      hourlyDistribution,
    },
  });
};

/**
 * Track QR code generation
 */
const handleTrackQr = async (req, res, payload, clientIP, userAgent) => {
  const { shortUrl } = payload;

  if (!shortUrl) {
    throw new ApiError(400, 'Short URL is required');
  }

  // Track event
  await AnalyticsModel.trackEvent({
    eventType: 'qr_generated',
    eventData: shortUrl,
    ip: clientIP,
    userAgent,
  });

  // Increment QR count on URL
  await AnalyticsModel.incrementQrCount(shortUrl);

  logger.info('QR generation tracked', { shortUrl });

  res.json({
    success: true,
    message: 'QR generation tracked',
  });
};

/**
 * Handle URL redirect (separate endpoint)
 * GET /co/:params or GET /:params
 */
const handleRedirect = async (req, res) => {
  const shortParam = req.shortParam;
  const constructedUrl = `${SHORT_URL_BASE}${shortParam}`;
  const clientIP = getClientIP(req);
  const userAgent = getUserAgent(req);

  try {
    // Get URL details
    const urlData = await UrlModel.findByShortUrl(constructedUrl);

    if (!urlData) {
      logger.warn('Invalid short URL invoked', { shortUrl: constructedUrl, ip: clientIP });
      return res.status(404).send(htmlTemplates.notFoundPage(constructedUrl));
    }

    if (urlData.expired_status === 1) {
      logger.info('Expired link accessed', { shortUrl: constructedUrl, ip: clientIP });
      return res.status(410).send(htmlTemplates.expiredPage(constructedUrl));
    }

    if (urlData.blacklisted === 1) {
      logger.warn('Blacklisted link invoked', { shortUrl: constructedUrl, ip: clientIP });
      return res.status(410).send(htmlTemplates.blacklistedPage(constructedUrl));
    }

    // Update click count and track visit
    await Promise.all([
      UrlModel.incrementClicks(urlData.id),
      VisitModel.create({
        urlId: urlData.id,
        ip: clientIP,
        userAgent,
        referer: req.headers.referer || null,
      }),
    ]);

    logger.info('URL redirect', { shortUrl: constructedUrl, mainUrl: urlData.main_url });

    res.redirect(307, urlData.main_url);
  } catch (error) {
    logger.error('Redirect error', { shortUrl: constructedUrl, error: error.message });
    return res.status(500).send(htmlTemplates.errorPage('Unable to process your request'));
  }
};

module.exports = {
  handleAction,
  handleRedirect,
  ACTIONS,
};
