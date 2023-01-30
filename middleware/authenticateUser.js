const { auth } = require('express-oauth2-jwt-bearer');
const { StatusCodes, getReasonPhrase } = require('http-status-codes');

// auth({
//   audience: 'https://lockerBot/api',
//   issuerBaseURL: `https://dev-jnqciskcg8a3djr8.jp.auth0.com/`,
// });

module.exports = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const authKey = authorization && authorization.split(' ')[1];

  if (!authKey || authKey !== process.env.AUTH_API_KEY) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: getReasonPhrase(StatusCodes.UNAUTHORIZED),
    });
  }

  return next();
}
