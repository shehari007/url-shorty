import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, type ZodType } from 'zod';
import { AppError, type FieldIssue } from '../lib/errors.js';

/**
 * Zod-backed request validation.
 *
 * The parsed result replaces `req.body` / `req.params`, and lands on
 * `req.validatedQuery` for query strings, in Express 5 `req.query` is a
 * getter and can no longer be assigned to.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}

function toIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

export function validateBody<T extends ZodType>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return next(AppError.validation('Please check the highlighted fields', toIssues(result.error)));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T extends ZodType>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) {
      return next(AppError.badRequest('Invalid query parameters', toIssues(result.error)));
    }
    req.validatedQuery = result.data;
    next();
  };
}

export function validateParams<T extends ZodType>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params ?? {});
    if (!result.success) {
      return next(AppError.badRequest('Invalid path parameters', toIssues(result.error)));
    }
    Object.assign(req.params, result.data);
    next();
  };
}

/** Typed accessor so handlers do not have to cast `req.validatedQuery`. */
export function query<T>(req: Request): T {
  return req.validatedQuery as T;
}

/* -------------------------------------------------------------------------- */
/*  Shared primitives                                                         */
/* -------------------------------------------------------------------------- */

export const trimmed = (max: number) => z.string().trim().max(max);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(255)
  .pipe(z.email({ message: 'Enter a valid email address' }));

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;
