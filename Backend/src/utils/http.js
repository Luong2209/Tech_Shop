function asyncHandler(handler) {
  return async function wrappedHandler(req, res, next) {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function createError(status, message, details) {
  const error = new Error(message);
  error.status = status;

  if (details !== undefined) {
    error.details = details;
  }

  return error;
}

function badRequest(message, details) {
  return createError(400, message, details);
}

function notFound(message) {
  return createError(404, message);
}

function toInt(value, fallback = undefined) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toNumber(value, fallback = undefined) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getPagination(query) {
  const page = Math.max(toInt(query.page, 1), 1);
  const pageSize = Math.min(Math.max(toInt(query.pageSize, 10), 1), 100);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

function slugify(input) {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = keyFn(item);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function createOrderCode() {
  const timestamp = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);

  const random = Math.floor(Math.random() * 9000 + 1000);
  return `ORD-${timestamp}-${random}`;
}

module.exports = {
  asyncHandler,
  badRequest,
  createError,
  createOrderCode,
  getPagination,
  notFound,
  slugify,
  toInt,
  toNumber,
  uniqueBy,
};
