const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    data,
  });
};

const sendError = (res, message, statusCode) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
  });
};

module.exports = { sendSuccess, sendError };
