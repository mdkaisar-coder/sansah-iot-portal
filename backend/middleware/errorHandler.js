// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log the error for internal tracking
  console.error('Error Details:', {
    message: err.message,
    code: err.code,
    sqlState: err.sqlState,
    stack: err.stack
  });

  let statusCode = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle MySQL database errors specifically
  if (err.code) {
    statusCode = 400;
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        message = 'Duplicate entry detected. This record already exists.';
        break;
      case 'ER_NO_REFERENCED_ROW_2':
      case 'ER_NO_REFERENCED_ROW':
        message = 'Referenced entity not found. Invalid relationship ID.';
        break;
      case 'ER_ROW_IS_REFERENCED_2':
      case 'ER_ROW_IS_REFERENCED':
        message = 'Cannot complete operation: this record is referenced by other entities.';
        break;
      case 'ECONNREFUSED':
        statusCode = 500;
        message = 'Database connection refused.';
        break;
      default:
        message = 'A database error occurred. Internal details have been masked.';
    }
  }

  // Handle Express bad JSON payload syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Bad JSON request payload.'
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors })
  });
};

module.exports = errorHandler;
