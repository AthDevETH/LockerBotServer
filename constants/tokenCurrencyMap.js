const Web3 = require("web3");
const book = require("../config");

module.exports = {
  1: {
    [Web3.utils.toChecksumAddress(book.networks[1].tokens.weth)]: "WETH",
    [Web3.utils.toChecksumAddress(book.networks[1].tokens.usdc)]: "USDC",
    [Web3.utils.toChecksumAddress(book.networks[1].tokens.usdt)]: "USDT",
    [Web3.utils.toChecksumAddress(book.networks[1].tokens.dai)]: "DAI",
  },
  56: {
    [Web3.utils.toChecksumAddress(book.networks[56].tokens.weth)]: "WETH",
    // [Web3.utils.toChecksumAddress(book.networks[56].tokens.usdc)]: "USDC",
    [Web3.utils.toChecksumAddress(book.networks[56].tokens.usdt)]: "USDT",
    [Web3.utils.toChecksumAddress(book.networks[56].tokens.dai)]: "DAI",
  },
  8453: {
    [Web3.utils.toChecksumAddress(book.networks[8453].tokens.weth)]: "WETH",
    [Web3.utils.toChecksumAddress(book.networks[8453].tokens.usdc)]: "USDC",
    // [Web3.utils.toChecksumAddress(book.networks[8453].tokens.usdt)]: "USDT",
    [Web3.utils.toChecksumAddress(book.networks[8453].tokens.dai)]: "DAI",
  },
};
