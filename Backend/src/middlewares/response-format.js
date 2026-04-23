function responseFormat(req, res, next) {
  const originalJson = res.json.bind(res);

  res.success = function success(data, options = {}) {
    return originalJson({
      success: true,
      message: options.message || "OK",
      data,
      meta: options.meta,
    });
  };

  res.json = function json(payload) {
    if (
      payload &&
      typeof payload === "object" &&
      Object.prototype.hasOwnProperty.call(payload, "success")
    ) {
      return originalJson(payload);
    }

    if (res.statusCode >= 400) {
      return originalJson({
        success: false,
        message: payload?.message || "Request failed",
        errors: payload?.details || payload?.errors,
      });
    }

    return originalJson({
      success: true,
      message: "OK",
      data: payload,
    });
  };

  next();
}

module.exports = {
  responseFormat,
};
