import type { NextFunction, Request, RequestHandler, Response } from "express";

export class HttpError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function asHandler(
  handler: (request: Request, response: Response) => Promise<unknown>,
): RequestHandler {
  return (request, response, next) => {
    handler(request, response).catch(next);
  };
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({
      error: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  response.status(500).json({ error: message });
}
