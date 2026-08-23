import { ErrorCode } from './codes';

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  cause?: unknown;
  details?: Record<string, unknown>;
}

/**
 * Application error that maps cleanly to the standard API error envelope.
 * Throw from services; route handlers convert to a response via `toResponse`.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(opts: AppErrorOptions) {
    super(opts.message);
    this.name = 'AppError';
    this.code = opts.code;
    this.statusCode = opts.statusCode ?? defaultStatusFor(opts.code);
    this.details = opts.details;
    if (opts.cause !== undefined) {
      (this as { cause?: unknown }).cause = opts.cause;
    }
  }

  toResponse() {
    return Response.json(
      { success: false, error: { code: this.code, message: this.message, details: this.details } },
      { status: this.statusCode },
    );
  }
}

function defaultStatusFor(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.UNAUTHORIZED:
      return 401;
    case ErrorCode.FORBIDDEN:
      return 403;
    case ErrorCode.NOT_FOUND:
      return 404;
    case ErrorCode.INVALID_REQUEST:
    case ErrorCode.INVALID_URL:
    case ErrorCode.DUPLICATE_MUSIC:
      return 400;
    case ErrorCode.RATE_LIMITED:
      return 429;
    case ErrorCode.DOWNLOAD_NOT_AVAILABLE:
      return 409;
    case ErrorCode.STORAGE_ERROR:
    case ErrorCode.DOWNLOAD_FAILED:
    case ErrorCode.INTERNAL_ERROR:
    default:
      return 500;
  }
}
