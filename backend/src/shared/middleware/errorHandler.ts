import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation error
  if (err instanceof ZodError) {
    const message = err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
    res.status(400).json({ error: `Validation error: ${message}` });
    return;
  }

  // Known application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Unknown error
  if (err instanceof Error) {
    console.error("[Server Error]", err.message, err.stack);
    res.status(500).json({ error: err.message || "Internal server error" });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
}

// Wrap async route handlers to catch errors
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
