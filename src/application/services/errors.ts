export class ServiceError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return (
    error instanceof Error &&
    typeof (error as ServiceError).code === "string" &&
    typeof (error as ServiceError).status === "number"
  );
}
