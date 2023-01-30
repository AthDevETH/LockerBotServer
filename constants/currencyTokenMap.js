const Web3 = require('web3');
const book = require('../config');

module.exports = {
  WETH: Web3.utils.toChecksumAddress(book.tokens.weth),
  USDC: Web3.utils.toChecksumAddress(book.tokens.usdc),
  USDT: Web3.utils.toChecksumAddress(book.tokens.usdt),
  DAI: Web3.utils.toChecksumAddress(book.tokens.dai),
};
