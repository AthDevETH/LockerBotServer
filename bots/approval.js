const transactions = require('../transactions/transactions');
const book = require('../config');

module.exports = {
  approveAllTokens: async () => {
    try {
      const a = await transactions.approve(book.tokens.weth);
      const b = await transactions.approve(book.tokens.usdc);
      const c = await transactions.approve(book.tokens.usdt);
      const d = await transactions.approve(book.tokens.dai);
      let stuff = [];
      stuff.push(a);
      stuff.push(b);
      stuff.push(c);
      stuff.push(d);
      return stuff;
    } catch {
      return false;
    }
  },
};
