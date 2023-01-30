const Web3 = require('web3');
const path = require('path');
const routerABI = require('../ABI/routerABI');
const { BN } = require('@openzeppelin/test-helpers');
const fs = require('fs/promises');
const erc20ABI = require('../ABI/erc20ABI');
const book = require('../config');

const configPath = path.join(__dirname, './config/config.json');

module.exports = {
  approve: async (token) => {
    const web3 = new Web3(token.Wallet.rpc);
    const tokenContract = new web3.eth.Contract(erc20ABI, token.address);
    const transaction = tokenContract.methods.approve(
      book.uniswap.router,
      '100000000000000000000000000',
    );
    const options = {
      to: token.address,
      data: transaction.encodeABI(),
      gas: await transaction.estimateGas({ from: token.Wallet.address }),
      gasPrice: await web3.eth.getGasPrice(),
    };
    const signed = await web3.eth.accounts.signTransaction(
      options,
      token.Wallet.privateKey,
    );
    const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
    console.log(`approved ${token.address}`);
    return receipt;
  },

  swap: async (pair) => {
    
    const web3 = new Web3(pair.Token.Wallet.rpc);
    const tokenContract = new web3.eth.Contract(erc20ABI, pair.tokenB);
    const paymentContract = new web3.eth.Contract(erc20ABI, pair.tokenA);

    const getPaymentBalance = paymentContract.methods.balanceOf(pair.Token.Wallet.address);
    const paymentBalanceBefore = await getPaymentBalance.call();

    const getBalance = tokenContract.methods.balanceOf(pair.Token.Wallet.address);
    const balance = await getBalance.call();

    const currentTime = parseInt(Date.now() / 1000);
    const router = new web3.eth.Contract(routerABI, book.uniswap.router);
    const transaction = router.methods.swapExactTokensForTokens(
      balance.toString(),
      0,
      [pair.tokenB, pair.tokenA],
      pair.Token.Wallet.address,
      currentTime + 300,
    );
    const options = {
      to: book.uniswap.router,
      data: transaction.encodeABI(),
      gas: await transaction.estimateGas({ from: pair.Token.Wallet.address }),
      gasPrice: await web3.eth.getGasPrice(),
    };
    const signed = await web3.eth.accounts.signTransaction(
      options,
      pair.Token.Wallet.privateKey,
    );
    const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
    console.log('sale complete');

    const paymentBalanceAfter = await getPaymentBalance.call();
    const profit = (new BN(paymentBalanceAfter.toString())).sub(new BN(paymentBalanceBefore.toString()));
    // instead of before and after balances, we should query getTransactionReceipt and look through logs to get amount transferred.
    // this is non-critical and we should test on live so that the tx's produce real logs.
    return profit;
  },
};
