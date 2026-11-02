function notFound(req, res) {
  res.status(404).json({
    message: `Không tìm thấy API: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      message: 'Dữ liệu đầu vào không hợp lệ',
      errors: err.issues?.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Dữ liệu không hợp lệ',
      errors: err.message,
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'ID không hợp lệ',
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      message: 'Dữ liệu đã tồn tại',
    });
  }

  res.status(err.status || 500).json({
    message:
      err.status && err.status < 500
        ? err.message
        : 'Lỗi máy chủ nội bộ',
  });
}

module.exports = { notFound, errorHandler };