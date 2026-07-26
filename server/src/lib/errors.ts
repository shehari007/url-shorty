/**
 * A single error shape for the whole API.
 *
 * `code` is a stable machine-readable string the frontend can branch on;
 * `message` is safe to show a user. Anything that is *not* an AppError is
 * treated as a bug and reported as a generic 500 in production.
 */

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'GONE'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'URL_BLOCKED'
  | 'URL_EXPIRED'
  | 'ACCOUNT_LOCKED'
  | 'INTERNAL';

export interface FieldIssue {
  path: string;
  message: string;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly issues?: FieldIssue[];
  readonly expose: boolean;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    options: { issues?: FieldIssue[]; cause?: unknown } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    if (options.issues) this.issues = options.issues;
    this.expose = statusCode < 500;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message = 'Bad request', issues?: FieldIssue[]) {
    return new AppError(400, 'BAD_REQUEST', message, issues ? { issues } : {});
  }

  static validation(message = 'The submitted data is invalid', issues?: FieldIssue[]) {
    return new AppError(422, 'VALIDATION_FAILED', message, issues ? { issues } : {});
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have access to this resource') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'Resource already exists') {
    return new AppError(409, 'CONFLICT', message);
  }

  static gone(message = 'This resource is no longer available', code: ErrorCode = 'GONE') {
    return new AppError(410, code, message);
  }

  static rateLimited(message = 'Too many requests. Please slow down.') {
    return new AppError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'Something went wrong on our side', cause?: unknown) {
    return new AppError(500, 'INTERNAL', message, cause !== undefined ? { cause } : {});
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
