const { BN } = require('@openzeppelin/test-helpers');
const Web3 = require('web3');
const tokenCurrencyMap = require('../constants/tokenCurrencyMap');

module.exports = (tokenAddress, value) =>
  tokenCurrencyMap[tokenAddress] === 'USDC'
    ? new BN((value * 1000000).toString())
    : new BN(Web3.utils.toWei(value.toString()));
