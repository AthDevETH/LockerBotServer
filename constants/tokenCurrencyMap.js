const Web3 = require('web3');
const book = require('../config');

module.exports = {
  [Web3.utils.toChecksumAddress(book.tokens.weth)]: 'WETH',
  [Web3.utils.toChecksumAddress(book.tokens.usdc)]: 'USDC',
  [Web3.utils.toChecksumAddress(book.tokens.usdt)]: 'USDT',
  [Web3.utils.toChecksumAddress(book.tokens.dai)]: 'DAI',
};
