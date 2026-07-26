import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { sendOk } from '../lib/http.js';
import {
  apiLimiter,
  contactLimiter,
  createLinkLimiter,
  reportLimiter,
  statsLimiter,
} from '../middleware/rate-limit.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { submitContact, submitContactSchema } from '../modules/contact/controller.js';
import { createShortLink, getPublicLinkStats, trackQr } from '../modules/links/controller.js';
import { createLinkSchema, lookupSchema, trackQrSchema } from '../modules/links/schemas.js';
import { peekLink } from '../modules/redirect/controller.js';
import { submitReport, submitReportSchema } from '../modules/reports/controller.js';
import { getPublicLeaderboard, getPublicStats } from '../modules/stats/controller.js';
import { adminRouter } from './admin.routes.js';

/**
 * Public REST API, versioned under `/api/v1`.
 *
 * The previous release exposed a single `POST /api/shorty-url` endpoint that
 * switched on an `action` field. That is preserved by `legacyRouter` below so
 * links and integrations built against it keep working.
 */
export const apiRouter: Router = Router();

/* -------------------------------- admin ---------------------------------- */

// Mounted before the public limiter so an authenticated operator paging
// through the console is governed only by `adminApiLimiter`, not by the
// tighter anonymous budget on top of it.
apiRouter.use('/admin', adminRouter);

apiRouter.use(apiLimiter);

/* -------------------------------- links ---------------------------------- */

apiRouter.post('/links', createLinkLimiter, validateBody(createLinkSchema), asyncHandler(createShortLink));
apiRouter.post('/links/stats', statsLimiter, validateBody(lookupSchema), asyncHandler(getPublicLinkStats));
apiRouter.post('/links/qr', validateBody(trackQrSchema), asyncHandler(trackQr));
apiRouter.get(
  '/links/:code/exists',
  validateParams(z.object({ code: z.string().min(3).max(32) })),
  asyncHandler(peekLink),
);

/* -------------------------------- stats ---------------------------------- */

apiRouter.get('/stats', statsLimiter, asyncHandler(getPublicStats));
apiRouter.get('/stats/leaderboard', statsLimiter, asyncHandler(getPublicLeaderboard));

/* ------------------------- reports & contact ----------------------------- */

apiRouter.post('/reports', reportLimiter, validateBody(submitReportSchema), asyncHandler(submitReport));
apiRouter.post('/contact', contactLimiter, validateBody(submitContactSchema), asyncHandler(submitContact));

/* -------------------------------------------------------------------------- */
/*  Legacy compatibility                                                      */
/* -------------------------------------------------------------------------- */

const legacyActionSchema = z.object({
  action: z.enum(['generate', 'stats', 'perLinkStats', 'contact', 'report', 'trackQr', 'dashboard']),
  url: z.string().optional(),
  shortUrl: z.string().optional(),
  fullname: z.string().optional(),
  email: z.string().optional(),
  message: z.string().optional(),
  detail: z.string().optional(),
  shortyUrl: z.string().optional(),
});

/**
 * Adapter for the v2 `POST /api/shorty-url` action endpoint. It reshapes the
 * old payloads into the new schemas and re-dispatches, so behaviour stays in
 * exactly one place.
 */
export const legacyRouter: Router = Router();

legacyRouter.post(
  '/',
  apiLimiter,
  validateBody(legacyActionSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof legacyActionSchema>;

    switch (body.action) {
      case 'generate':
        req.body = createLinkSchema.parse({ url: body.url });
        return createShortLink(req, res);

      case 'stats':
      case 'dashboard':
        return getPublicStats(req, res);

      case 'perLinkStats':
        req.body = lookupSchema.parse({ url: body.url ?? body.shortUrl });
        return getPublicLinkStats(req, res);

      case 'trackQr':
        req.body = trackQrSchema.parse({ url: body.shortUrl ?? body.url });
        return trackQr(req, res);

      case 'contact':
        req.body = submitContactSchema.parse({
          fullname: body.fullname,
          email: body.email,
          message: body.message ?? body.detail,
        });
        return submitContact(req, res);

      case 'report':
        req.body = submitReportSchema.parse({
          email: body.email,
          url: body.shortyUrl ?? body.url,
          detail: body.detail ?? body.message,
        });
        return submitReport(req, res);

      default:
        return sendOk(res, { message: 'Unsupported action' }, undefined, 400);
    }
  }),
);
