module.exports = {
  "development": {
    "dialect": "mysql",
    "host": process.env.DB_HOST,
    "username": process.env.DB_USER,
    "password": process.env.DB_PW,
    "database": process.env.DB_NAME,
  },
  "production": {
    "dialect": "mysql",
    "host": process.env.DB_HOST,
    "username": process.env.DB_USER,
    "password": process.env.DB_PW,
    "database": process.env.DB_NAME,
  }
}
