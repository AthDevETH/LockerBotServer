const Web3 = require('web3');
const { BN } = require('@openzeppelin/test-helpers');
const tokenCurrencyMap = require('../constants/tokenCurrencyMap');

module.exports = (tokenAddress, value) =>
  tokenCurrencyMap[tokenAddress] === 'USDC'
    ? parseInt(value)
    : parseFloat(Web3.utils.fromWei(new BN(value))).toFixed(4);
