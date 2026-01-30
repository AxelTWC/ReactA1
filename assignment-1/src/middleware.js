// This file contains Express middleware functions used by the server.
//
// You DO NOT need to modify requestLogger or errorHandler.
// Your task is to implement:
//   - validatePaper
//   - validateId
//   - validateQueryParams

// ------------------------------------------------------------
// Request logger middleware
// Logs each incoming request (for debugging / visibility)
// ------------------------------------------------------------
const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};

// ------------------------------------------------------------
// Error handler middleware (unexpected failures only)
//
// This middleware is a safety net for unexpected server errors
// (e.g. database errors or runtime exceptions).
//
// You do NOT need to trigger or handle 500 errors explicitly
// in this assignment. If something unexpected goes wrong,
// this middleware ensures the server returns a JSON error
// instead of crashing.
// ------------------------------------------------------------
const errorHandler = (err, req, res, next) => {
  console.error(err);

  // If a response has already been sent, let Express handle it
  if (res.headersSent) return next(err);

  return res.status(500).json({ error: "Internal Server Error" });
};

// ------------------------------------------------------------
// validatePaper
//
// Validates the request body for POST / PUT requests.
//
// Return value:
// - An array of error messages
// - Empty array [] means validation passed
//
// Required fields:
// - title: non-empty string
// - authors: non-empty string
// - published_in: non-empty string
// - year: integer greater than 1900
//
// Error message strings MUST match the handout exactly.
// ------------------------------------------------------------
const validatePaper = (paper) => {
  const errors = [];

  const hasText = (value) => typeof value === "string" && value.trim().length > 0;
  const yearVal = paper?.year;

  if (!hasText(paper?.title)) errors.push("Title is required");
  if (!hasText(paper?.authors)) errors.push("Authors are required");
  if (!hasText(paper?.published_in)) errors.push("Published venue is required");

  if (yearVal === undefined || yearVal === null) {
    errors.push("Published year is required");
  } else {
    const yearNum = Number(yearVal);
    if (!Number.isInteger(yearNum) || yearNum <= 1900) {
      errors.push("Valid year after 1900 is required");
    }
  }

  // Required error messages:
  // - "Title is required"
  // - "Authors are required"
  // - "Published venue is required"
  // - "Published year is required"
  // - "Valid year after 1900 is required"

  return errors;
};

// ------------------------------------------------------------
// validateId
//
// Middleware to validate :id route parameter.
//
// If the ID is invalid:
// - Respond immediately with status 400
// - Do NOT call next()
//
// Error response format:
// {
//   "error": "Validation Error",
//   "message": "Invalid ID format"
// }
//
// If valid, call next() to continue.
// ------------------------------------------------------------
const validateId = (req, res, next) => {
  const idNum = Number(req.params.id);
  const isValid = Number.isInteger(idNum) && idNum > 0;

  if (!isValid) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Invalid ID format",
    });
  }

  req.params.id = idNum;
  return next();
};

// ------------------------------------------------------------
// validateQueryParams
//
// Middleware to validate query parameters for GET /api/papers.
//
// Supported query parameters:
// - year   (integer > 1900)
// - limit  (integer between 1 and 100)
// - offset (integer >= 0)
//
// If any query parameter is invalid:
// - Respond with status 400
// - Do NOT call next()
//
// Error response format:
// {
//   "error": "Validation Error",
//   "message": "Invalid query parameter format"
// }
//
// If all parameters are valid, call next().
// ------------------------------------------------------------
const validateQueryParams = (req, res, next) => {
  const { year, limit, offset } = req.query;

  const invalidYear =
    year !== undefined && year !== null && (!Number.isInteger(Number(year)) || Number(year) <= 1900);

  const invalidLimit =
    limit !== undefined && limit !== null && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100);

  const invalidOffset =
    offset !== undefined && offset !== null && (!Number.isInteger(Number(offset)) || Number(offset) < 0);

  if (invalidYear || invalidLimit || invalidOffset) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Invalid query parameter format",
    });
  }

  // Normalize numeric values for downstream use
  if (year !== undefined && year !== null) req.query.year = Number(year);
  if (limit !== undefined && limit !== null) req.query.limit = Number(limit);
  if (offset !== undefined && offset !== null) req.query.offset = Number(offset);

  return next();
};

module.exports = {
  requestLogger,
  errorHandler,
  validatePaper,
  validateId,
  validateQueryParams,
};
