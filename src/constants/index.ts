/**
 * Predefined error types
 */
export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: "bad_request",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  METHOD_NOT_ALLOWED: "method_not_allowed",
  CONFLICT: "conflict",
  UNPROCESSABLE_ENTITY: "unprocessable_entity",
  TOO_MANY_REQUESTS: "too_many_requests",

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: "internal_server_error",
  NOT_IMPLEMENTED: "not_implemented",
  SERVICE_UNAVAILABLE: "service_unavailable",

  // Custom domain errors
  VALIDATION_ERROR: "validation_error",
  BUSINESS_CONSTRAINT_VIOLATION: "business_constraint_violation",
  RESOURCE_EXISTS: "resource_exists",
  RESOURCE_EXPIRED: "resource_expired",
  DEPENDENCY_FAILURE: "dependency_failure",
} as const;

// Type-safe error code union type
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const PAGE_SIZE = 50;

export const DEFAULT_MATERIAL_ID = 9999;

export const DEFAULT_TYPE_ID = 9999;

export const DEFAULT_SIZE_ID = 9999;

export const CACHE_NAME_SCREWS = "SCREWS"

export const CACHE_NAME_SCREW = "SCREW"
