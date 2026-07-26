import type { Response } from 'express';
import type { ErrorCode, FieldIssue } from './errors.js';

/**
 * One envelope for every JSON response so clients never have to guess.
 *
 *   success: { success: true,  data: T,  meta?: {...} }
 *   failure: { success: false, error: { code, message, issues? } }
 */

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    issues?: FieldIssue[];
  };
  requestId?: string;
}

export function sendOk<T>(res: Response, data: T, meta?: ApiMeta, statusCode = 200): Response {
  const body: ApiSuccess<T> = meta ? { success: true, data, meta } : { success: true, data };
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T, meta?: ApiMeta): Response {
  return sendOk(res, data, meta, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).end();
}

export function buildPageMeta(page: number, pageSize: number, total: number): ApiMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  };
}

/** `Cache-Control` presets, public reads are cheap to cache, admin reads never are. */
export const cache = {
  noStore: (res: Response) => res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private'),
  publicShort: (res: Response, seconds = 60) =>
    res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds * 5}`),
};
