require('dotenv').config();
const express = require('express');
require('express-async-errors');
const cors = require('cors');
const http = require('http');
const apiRoutes = require('./routes');
const lockerBot = require('./services/lockerBot');
const setupWebsocketServer = require('./services/websocket');
const uncaughtException = require('./middleware/uncaughtException');

const setupMiddleware = app => {
  app.use(express.json());

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );

  app.use(apiRoutes);
  app.use(uncaughtException);
}

const main = async () => {
  const app = express();
  const server = http.createServer(app);
  setupMiddleware(app);
  setupWebsocketServer(server);

  await lockerBot.init();

  app.listen(process.env.PORT || 8080, async () => {
    console.log(`Locker bot online on ${process.env.SERVER_PORT || 8080}.`);
  });
}

main();
