const { validationResult } = require('express-validator');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.code === 11000 || err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Duplicate entry: Resource already exists' });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Resource not found or invalid ID format' });
  }

  let statusCode = err.statusCode || err.status || 500;
  if (statusCode === 401 && (err.type?.includes('Stripe') || err.rawType === 'authentication_error' || !err.isAuthError)) {
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
};

module.exports = { errorHandler, validateRequest, notFound };
