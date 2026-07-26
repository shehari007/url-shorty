import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError, isAppError, type FieldIssue } from '../lib/errors.js';
import type { ApiFailure } from '../lib/http.js';
import { logger } from '../lib/logger.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
};

interface DriverError {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

/** Maps the handful of MySQL driver errors that are really client mistakes. */
function fromDriverError(error: DriverError): AppError | null {
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      return AppError.conflict('That record already exists');
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return AppError.badRequest('Referenced record does not exist');
    case 'ER_DATA_TOO_LONG':
      return AppError.badRequest('One of the submitted values is too long');
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return AppError.conflict('This record is still referenced by other data');
    case 'ECONNREFUSED':
    case 'PROTOCOL_CONNECTION_LOST':
    case 'ETIMEDOUT':
      return new AppError(503, 'INTERNAL', 'The database is temporarily unavailable');
    default:
      return null;
  }
}

/**
 * Terminal error handler. Client errors are returned verbatim; anything else is
 * logged with its stack and reduced to a generic 500 so internals never leak.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let appError: AppError;

  if (isAppError(err)) {
    appError = err;
  } else if (err instanceof ZodError) {
    const issues: FieldIssue[] = err.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
    }));
    appError = AppError.validation('The submitted data is invalid', issues);
  } else if (err instanceof SyntaxError && 'body' in err) {
    // Thrown by express.json() on malformed JSON.
    appError = AppError.badRequest('Request body is not valid JSON');
  } else if (typeof err === 'object' && err !== null && 'code' in err) {
    appError = fromDriverError(err as DriverError) ?? AppError.internal('Something went wrong on our side', err);
  } else {
    appError = AppError.internal('Something went wrong on our side', err);
  }

  const logPayload = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl.split('?')[0],
    status: appError.statusCode,
    code: appError.code,
    ip: req.client?.ip,
    err: err instanceof Error ? { message: err.message, stack: err.stack } : { message: String(err) },
  };

  if (appError.statusCode >= 500) {
    logger.error(logPayload, 'unhandled error');
  } else {
    logger.warn({ ...logPayload, err: undefined }, appError.message);
  }

  if (res.headersSent) return;

  const body: ApiFailure = {
    success: false,
    error: {
      code: appError.code,
      message: appError.expose || !env.isProduction ? appError.message : 'Something went wrong on our side',
      ...(appError.issues ? { issues: appError.issues } : {}),
    },
    requestId: req.requestId,
  };

  res.status(appError.statusCode).json(body);
};
