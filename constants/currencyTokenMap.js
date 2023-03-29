const Web3 = require("web3");
const book = require("../config");

module.exports = {
  1: {
    WETH: Web3.utils.toChecksumAddress(book.networks[1].tokens.weth),
    USDC: Web3.utils.toChecksumAddress(book.networks[1].tokens.usdc),
    USDT: Web3.utils.toChecksumAddress(book.networks[1].tokens.usdt),
    DAI: Web3.utils.toChecksumAddress(book.networks[1].tokens.dai),
  },
  56: {
    WETH: Web3.utils.toChecksumAddress(book.networks[56].tokens.weth),
    // USDC: Web3.utils.toChecksumAddress(book.networks[56].tokens.usdc),
    USDT: Web3.utils.toChecksumAddress(book.networks[56].tokens.usdt),
    DAI: Web3.utils.toChecksumAddress(book.networks[56].tokens.dai),
  },
};
