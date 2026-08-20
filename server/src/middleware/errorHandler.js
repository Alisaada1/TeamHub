export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    data: null,
    error: err.message || "Internal server error",
  });
}

export function notFound(_req, res) {
  res.status(404).json({
    success: false,
    data: null,
    error: "Route not found",
  });
}
