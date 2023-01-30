const WebSocket = require('ws');

const setupWebsocketServer = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on(`connection`, (ws) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on(`message`, (message) => {
      console.log(`received: %s`, message);
      ws.send(`Hello, you sent -> ${message}`);
    });

    ws.send('Welcome to LockerBot WSS');
  });

  const startListening = (data) => {
    // wss.clients is an array of all connected clients
    try {
      wss.clients.forEach(function each(client) {
        client.send(data);
        console.log('Sent: ' + json);
      });
    } catch {
      console.log('something failed');
    }
  };

  const stopListening = (data) => {
    // wss.clients is an array of all connected clients
    try {
      wss.clients.forEach(function each(client) {
        client.send(data);
        console.log('Sent: ' + json);
      });
    } catch {
      console.log('something failed');
    }
  };

  const newPair = (data) => {
    var json = JSON.stringify(data);
    // wss.clients is an array of all connected clients
    wss.clients.forEach(function each(client) {
      client.send(json);
      console.log('Sent: ' + json);
    });
  };

  const purchasedOrSold = (data) => {
    var json = JSON.stringify(data);
    // wss.clients is an array of all connected clients
    wss.clients.forEach(function each(client) {
      client.send(json);
      console.log('Sent: ' + json);
    });
  };

  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();

      ws.isAlive = false;
      ws.ping(null, false, true);
    });
  }, 10000);
};

module.exports = setupWebsocketServer;
