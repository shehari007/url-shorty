/** Shapes returned by the Shorty API. Kept in sync with `server/src/lib/http.ts`. */

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; issues?: { path: string; message: string }[] };
  requestId?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type LinkStatus = 'active' | 'not_found' | 'expired' | 'blocked' | 'deleted';

export interface PublicLink {
  code: string;
  shortUrl: string;
  destination: string;
  domain: string | null;
  title: string | null;
  clicks: number;
  qrDownloads: number;
  createdAt: string;
  expiresAt: string | null;
  lastClickedAt: string | null;
  status: LinkStatus;
  reused?: boolean;
}

export interface PlatformStats {
  totalLinks: number;
  totalClicks: number;
  linksToday: number;
  clicksToday: number;
  qrDownloads: number;
  activeLinks: number;
}

export interface TrendPoint {
  date: string;
  links: number;
  clicks: number;
}

export interface PublicStatsResponse {
  totals: PlatformStats;
  trend: TrendPoint[];
}

export interface LinkAnalytics {
  totals: {
    totalVisits: number;
    uniqueVisitors: number;
    visitsToday: number;
    visitsLast7Days: number;
    visitsLast30Days: number;
    botVisits: number;
  };
  daily: { date: string; visits: number }[];
  referrers: { referrer: string; visits: number }[];
  countries: { country: string; visits: number }[];
  devices: { device: string; visits: number }[];
}

export interface PublicLinkStats extends LinkAnalytics {
  link: PublicLink;
}

/* ------------------------------- admin ----------------------------------- */

export type AdminRole = 'owner' | 'admin' | 'moderator';

export interface AdminProfile {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  createdAt?: string;
}

export type RiskLevel = 'clean' | 'low' | 'suspicious' | 'high';

export interface RiskSignal {
  code: string;
  label: string;
  weight: number;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  signals: RiskSignal[];
}

export interface CreatorIpIntel {
  ip: string;
  userAgent: string | null;
  totalLinks: number;
  blockedLinks: number;
  reportedLinks: number;
  firstSeen: string | null;
  lastSeen: string | null;
  otherLinks: {
    id: number;
    code: string;
    domain: string | null;
    blacklisted: boolean;
    reportCount: number;
    createdAt: string;
  }[];
}

export interface VisitorIpIntel {
  ip: string | null;
  hits: number;
  botHits: number;
  country: string | null;
  lastSeen: string;
}

export interface AdminLink {
  id: number;
  code: string;
  shortUrl: string;
  destination: string;
  domain: string | null;
  title: string | null;
  status: LinkStatus;
  blacklisted: boolean;
  expired: boolean;
  flagged: boolean;
  clicks: number;
  qrDownloads: number;
  reportCount: number;
  createdAt: string;
  expiresAt: string | null;
  lastClickedAt: string | null;
  deletedAt: string | null;
  adminNote: string | null;
  createdByIp: string | null;
  createdByAgent: string | null;
  risk: RiskAssessment;
}

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';
export type ReportReason = 'phishing' | 'malware' | 'spam' | 'adult' | 'copyright' | 'other';

export interface AdminReport {
  id: number;
  email: string;
  shortUrl: string;
  urlId: number | null;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  reportedAt: string;
  reporterIp: string | null;
  reviewedAt: string | null;
  resolutionNote: string | null;
  linkCode: string | null;
  linkDestination: string | null;
  linkBlocked: boolean;
  linkReportCount: number | null;
}

export type ContactStatus = 'pending' | 'read' | 'replied' | 'archived';

export interface AdminContact {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactStatus;
  sentAt: string;
  ip: string | null;
  userAgent: string | null;
  handledAt: string | null;
  adminNote: string | null;
}

export interface AdminOverview {
  links: {
    total: number;
    active: number;
    blocked: number;
    expired: number;
    flagged: number;
    suspicious: number;
    deleted: number;
    today: number;
  };
  clicks: { total: number; today: number; last7Days: number; bots: number };
  reports: { total: number; pending: number };
  contacts: { total: number; pending: number };
  qr: { total: number };
}

export interface AdminDashboard {
  overview: AdminOverview;
  visitTrend: { date: string; visits: number; bots: number }[];
  linkTrend: TrendPoint[];
  topLinks: { id: number; code: string; shortUrl: string; destination: string; domain: string | null; clicks: number; createdAt: string }[];
  recentLinks: { id: number; code: string; shortUrl: string; destination: string; domain: string | null; clicks: number; createdAt: string }[];
  hourly: { hour: number; visits: number }[];
  topDomains: { domain: string; links: number }[];
}

export interface AuditEntry {
  id: number;
  adminId: number | null;
  adminEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface BlockedDomain {
  id: number;
  domain: string;
  reason: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface AdminAccount {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lockedUntil: string | null;
  createdAt: string;
}
