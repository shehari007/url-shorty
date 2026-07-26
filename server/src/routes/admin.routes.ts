import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { requireAdmin, requireRole } from '../middleware/auth.js';
import { adminApiLimiter, adminLoginLimiter } from '../middleware/rate-limit.js';
import { idParamSchema, validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  changePassword,
  changePasswordSchema,
  login,
  loginSchema,
  logout,
  me,
  refresh,
  refreshSchema,
} from '../modules/admin/auth.controller.js';
import {
  createAdmin,
  createAdminSchema,
  getAuditLog,
  getDashboard,
  listAdmins,
  listAuditSchema,
  revokeAdminSessions,
  updateAdmin,
  updateAdminSchema,
} from '../modules/admin/dashboard.controller.js';
import {
  bulkAction,
  bulkActionSchema,
  deleteLink,
  getLink,
  listLinks,
  listLinksSchema,
  purgeLink,
  restoreLink,
  updateLink,
  updateLinkSchema,
} from '../modules/admin/links.controller.js';
import {
  addBlockedDomain,
  createBlockedDomainSchema,
  deleteContact,
  deleteReport,
  listBlockedDomains,
  listContacts,
  listContactsSchema,
  listReports,
  listReportsSchema,
  removeBlockedDomain,
  updateContact,
  updateContactSchema,
  updateReport,
  updateReportSchema,
} from '../modules/admin/moderation.controller.js';

/**
 * Admin control plane. Everything below `/auth` requires a valid access token;
 * destructive and account-level actions additionally require a higher role.
 */
export const adminRouter: Router = Router();

/* -------------------------------- auth ---------------------------------- */

adminRouter.post('/auth/login', adminLoginLimiter, validateBody(loginSchema), asyncHandler(login));
adminRouter.post('/auth/refresh', adminApiLimiter, validateBody(refreshSchema), asyncHandler(refresh));
adminRouter.post('/auth/logout', requireAdmin, asyncHandler(logout));
adminRouter.get('/auth/me', requireAdmin, asyncHandler(me));
adminRouter.post(
  '/auth/password',
  requireAdmin,
  validateBody(changePasswordSchema),
  asyncHandler(changePassword),
);

/* ---------------------- everything below is protected -------------------- */

adminRouter.use(requireAdmin, adminApiLimiter);

/* ------------------------------ dashboard -------------------------------- */

adminRouter.get('/dashboard', asyncHandler(getDashboard));
adminRouter.get('/audit', validateQuery(listAuditSchema), asyncHandler(getAuditLog));

/* -------------------------------- links ---------------------------------- */

adminRouter.get('/links', validateQuery(listLinksSchema), asyncHandler(listLinks));
adminRouter.post('/links/bulk', validateBody(bulkActionSchema), asyncHandler(bulkAction));
adminRouter.get('/links/:id', validateParams(idParamSchema), asyncHandler(getLink));
adminRouter.patch(
  '/links/:id',
  validateParams(idParamSchema),
  validateBody(updateLinkSchema),
  asyncHandler(updateLink),
);
adminRouter.delete('/links/:id', validateParams(idParamSchema), asyncHandler(deleteLink));
adminRouter.post('/links/:id/restore', validateParams(idParamSchema), asyncHandler(restoreLink));
// Hard delete drops visit history with it, owners only.
adminRouter.delete(
  '/links/:id/purge',
  requireRole('owner'),
  validateParams(idParamSchema),
  asyncHandler(purgeLink),
);

/* ------------------------------- reports --------------------------------- */

adminRouter.get('/reports', validateQuery(listReportsSchema), asyncHandler(listReports));
adminRouter.patch(
  '/reports/:id',
  validateParams(idParamSchema),
  validateBody(updateReportSchema),
  asyncHandler(updateReport),
);
adminRouter.delete(
  '/reports/:id',
  requireRole('admin'),
  validateParams(idParamSchema),
  asyncHandler(deleteReport),
);

/* ------------------------------- contacts -------------------------------- */

adminRouter.get('/contacts', validateQuery(listContactsSchema), asyncHandler(listContacts));
adminRouter.patch(
  '/contacts/:id',
  validateParams(idParamSchema),
  validateBody(updateContactSchema),
  asyncHandler(updateContact),
);
adminRouter.delete(
  '/contacts/:id',
  requireRole('admin'),
  validateParams(idParamSchema),
  asyncHandler(deleteContact),
);

/* --------------------------- blocked domains ----------------------------- */

adminRouter.get('/blocked-domains', asyncHandler(listBlockedDomains));
adminRouter.post(
  '/blocked-domains',
  requireRole('admin'),
  validateBody(createBlockedDomainSchema),
  asyncHandler(addBlockedDomain),
);
adminRouter.delete(
  '/blocked-domains/:id',
  requireRole('admin'),
  validateParams(idParamSchema),
  asyncHandler(removeBlockedDomain),
);

/* -------------------------- admin accounts ------------------------------- */

adminRouter.get('/admins', requireRole('owner'), asyncHandler(listAdmins));
adminRouter.post('/admins', requireRole('owner'), validateBody(createAdminSchema), asyncHandler(createAdmin));
adminRouter.patch(
  '/admins/:id',
  requireRole('owner'),
  validateParams(idParamSchema),
  validateBody(updateAdminSchema),
  asyncHandler(updateAdmin),
);
adminRouter.post(
  '/admins/:id/revoke-sessions',
  requireRole('owner'),
  validateParams(idParamSchema),
  asyncHandler(revokeAdminSessions),
);
