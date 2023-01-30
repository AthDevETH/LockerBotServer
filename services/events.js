const { EventEmitter } = require('node:events');

class Events extends EventEmitter {
  constructor() {
    super();
  }

  publish(event, data) {
    this.emit(event, data);
  }

  async publishSync(event, data) {
    return new Promise((resolve, reject) => {
      this.emit(event, data, (err, response) => {
        if (err) {
          return reject(err);
        }

        return resolve(response);
      });
    });
  }

  subscribe(event, callback) {
    this.on(event, async (payload, responseCallback) => {
      if (typeof responseCallback === 'function') {
        try {
          const result = await callback(payload);

          responseCallback(null, result);
        } catch (err) {
          responseCallback(err);
        }
      } else {
        callback(payload);
      }
    });
  }
}

module.exports = new Events();
module.exports.TOKEN_CHANGED_EVENT = 'TOKEN_CHANGED_EVENT';
module.exports.WALLET_CHANGED_EVENT = 'WALLET_CHANGED_EVENT';
module.exports.TRIGGER_APPROVE_EVENT = `TRIGGER_APPROVE_EVENT`;
module.exports.TRIGGER_SALE_EVENT = `TRIGGER_SALE_EVENT`;
