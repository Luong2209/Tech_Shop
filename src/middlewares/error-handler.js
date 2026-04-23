function errorHandler(error, req, res, next) {
  // Normalize common Prisma errors to 4xx so API clients get actionable feedback.
  // Keep it lightweight: only map cases we actually hit in this codebase (unique, missing record).
  if (
    error &&
    typeof error === "object" &&
    error.code &&
    typeof error.code === "string"
  ) {
    // P2002: Unique constraint failed
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : error.meta?.target;
      return res.status(400).json({
        message: target ? `Duplicate value for: ${target}` : "Duplicate value",
        details: error.meta,
      });
    }

    // P2025: Record not found
    if (error.code === "P2025") {
      return res.status(404).json({
        message: error.message || "Record not found",
        details: error.meta,
      });
    }
  }

  const status = error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    message: error.message || "Internal server error",
    details: error.details,
  });
}

module.exports = {
  errorHandler,
};
