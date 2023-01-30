const { StatusCodes, getReasonPhrase } = require('http-status-codes');

module.exports = (err, req, res, _) => {
  console.log('LOGS:');
  console.log(err);

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
  });
};
