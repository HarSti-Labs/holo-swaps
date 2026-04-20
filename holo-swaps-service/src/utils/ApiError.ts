export class ApiError extends Error {
  statusCode: number;
  errors?: string[];

  constructor(message: string, statusCode: number, errors?: string[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, errors?: string[]) {
    return new ApiError(message, 400, errors);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(message, 401);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(message, 403);
  }

  static notFound(message = "Not found") {
    return new ApiError(message, 404);
  }

  static conflict(message: string) {
    return new ApiError(message, 409);
  }

  static internal(message = "Internal server error") {
    return new ApiError(message, 500);
  }
}
