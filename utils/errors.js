const errorTypes = {
  TRANSACTION_ERROR: 'TransactionError',
};

class TransactionError extends Error {
  constructor(message) {
    super(message);
    this.name = errorTypes.TRANSACTION_ERROR;
  }
}

module.exports.TransactionError = TransactionError;
module.exports.types = errorTypes;
