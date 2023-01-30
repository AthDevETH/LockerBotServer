const bind = require('lodash/bind');
const isEmpty = require('lodash/isEmpty');
const Web3 = require('web3');
const { BN } = require('@openzeppelin/test-helpers');
const web3Pool = require('./web3Pool');
const { models } = require('./storage');
const events = require('./events');
const Transactions = require('./transactions');
const unicryptABI = require('../ABI/unicrypt');
const teamFinanceABI = require('../ABI/teamLockerABI');
const routerABI = require('../ABI/routerABI');
const pairABI = require('../ABI/pairABI');
const book = require('../config');
const erc20ABI = require('../ABI/erc20ABI');
const getRandomInterval = require('../utils/getRandomInterval');
const { TransactionError } = require('../utils/errors');
const convertPrice = require('../utils/convertPrice');
const convertBuyAmount = require('../utils/convertBuyAmount');
const tokenCurrencyMap = require('../constants/tokenCurrencyMap');
const currencyTokenMap = require('../constants/currencyTokenMap');
const checkIfNew = require("./checkOldToken");
const http = require("http");

class LockerBot {
  constructor() {
    this.web3 = web3Pool.getNode();
    this.unicryptContract = null;
    this.teamFinanceContract = null;
    this.routerContract = null;
    this.tokenIds = {};
    this.monitorPairs = new Map();
    this.unicryptId = null;
    this.teamFinanceId = null;
    this.transactions = null;
    this.events = events;
  }

  async init() {
    console.log("starting");
    await this.initPairsMonitoring();
    await this.initContracts();

    this.routerContract = new this.web3.eth.Contract(
      routerABI,
      book.uniswap.router,
    );

    this.transactions = new Transactions(this.web3, this.routerContract); // TODO: Move all chain logic into this.transactions

    this.events.subscribe(
      this.events.WALLET_CHANGED_EVENT,
      this.checkContracts.bind(this),
    );

    this.events.subscribe(
      this.events.TOKEN_CHANGED_EVENT,
      async ({ tokenId }) => {
        console.log('TOKEN_CHANGED_EVENT_PROCESSING >>>>>>>> ' + tokenId);
        const pairsByTokenId = this.tokenIds[tokenId];

        if (pairsByTokenId) {
          for (const pair of pairsByTokenId) {
            const monitorInfo = this.monitorPairs.get(pair.id);
            this.monitorPairs.delete(pair.id);
            clearInterval(monitorInfo.intervalId);
          }
        }

        delete this.tokenIds[tokenId];

        const pairs = await models.Pair.findAllPurchasedPairsByTokenId(tokenId);
        pairs.forEach((pair) => this._monitor(pair));
      },
    );

    this.events.subscribe(this.events.TRIGGER_SALE_EVENT, async (pair) => {
      console.log(pair);
      // we should check if monitor is not attempting a sale at this time too. Would probably need new tracking variable for it

      try {
        const tokenContract = this._createERC20TokenContract(pair.tokenB);
        const paymentContract = this._createERC20TokenContract(pair.tokenA);
        const getPaymentBalance = paymentContract.methods.balanceOf(
          pair.Token.Wallet.address,
        );
        const getBalance = tokenContract.methods.balanceOf(
          pair.Token.Wallet.address,
        );
        const paymentInit = await getPaymentBalance.call();
        const toSwap = await getBalance.call();
        await this._swap_(
          toSwap,
          [pair.tokenB, pair.tokenA],
          pair.Token.Wallet.address,
          pair.Token.Wallet.privateKey,
        );
        console.log('swapped');
        const paymentAfter = await getPaymentBalance.call();
        const profit = new BN(paymentAfter.toString()).sub(
          new BN(paymentBefore.toString()),
        );
        const totalProfit = new BN(pair.profit.toString()).add(profit);

        // remove monitor if pair is active
        try {
          const monitorInfo = this.monitorPairs.get(pair.id);
          console.log(monitorInfo);
          this.monitorPairs.delete(pair.id);
          clearInterval(monitorInfo.intervalId);
        } catch {
          console.log('monitor not running');
        }

        return await models.Pair.update(
          {
            profit: totalProfit.toString(),
            status: `Closed`,
          },
          {
            where: {
              id: pair.id,
            },
          },
        );
      } catch {
        return pair;
      }
    });

    this.events.subscribe(this.events.TRIGGER_APPROVE_EVENT, async (token) => {
      try {
        const contract = this._createERC20TokenContract(token.address);

        await this._approve(
          token,
          token.address,
          contract,
          '10000000000000000000000000',
        );
      } catch (err) {
        throw new TransactionError(err.message);
      }
    });
  }

  async initPairsMonitoring() {
    const pairs = await models.Pair.findAllPurchasedPairs();
    // included the delay on loop here because if all monitors start at the same time, most transactions will fail if from the same address
    let count = 0;
    const timeout = getRandomInterval(25); // TODO: Not sure if this random interval should be here and within this._monitor()
    const interval = setInterval(async () => {
      if (count >= pairs.length) {
        clearInterval(interval);
        return;
      }

      this._monitor(pairs[count]);
      count++;
    }, timeout);
  }

  async initContracts() {
    await this.checkContracts();
  }

  async checkContracts() {
    const activeWallets = await models.Wallet.findActiveWallets();
    const startUnicrypt = activeWallets.some((wallet) => wallet.startUnicrypt);
    const startTeamFin = activeWallets.some((wallet) => wallet.startTeamFin);

    if (startUnicrypt && !this.unicryptContract) {
      this.initUnicrypt(true);
    }

    if (startTeamFin && !this.teamFinanceContract) {
      this.initTeamFinance(true);
    }

    if (!startUnicrypt && this.unicryptContract) {
      this.initUnicrypt(false);
    }

    if (!startTeamFin && this.teamFinanceContract) {
      this.initTeamFinance(false);
    }
  }

  initUnicrypt(shouldStart) {
    if (!shouldStart && this.unicryptContract && this.unicryptContract.options) {
      this.unicryptContract.options.requestManager.removeSubscription(
        this.unicryptId,
      );

      this.unicryptContract = null;
      return;
    }
    console.log("online unicrypt")
    this.unicryptContract = new this.web3.eth.Contract(
      unicryptABI,
      book.lockers.unicrypt,
    );

    this.unicryptContract.events
      .onDeposit({}, function (error, event) {})
      .on('connected', (id) => {
        this.unicryptId = id;
      })
      .on('data', (event) => 
        this._checkLiquidityPool(event.returnValues.lpToken),
      );
  }

  initTeamFinance(shouldStart) {
    if (!shouldStart && this.teamFinanceContract && this.teamFinanceContract.options) {
      this.teamFinanceContract.options.requestManager.removeSubscription(
        this.teamFinanceId,
      );
      this.teamFinanceContract = null;
      return;
    }

    this.teamFinanceContract = new this.web3.eth.Contract(
      teamFinanceABI,
      book.lockers.teamFin,
    );
    console.log("online teamfin")
    this.teamFinanceContract.events
      .Deposit({}, function (error, event) {})
      .on('connected', (id) => {
        this.teamFinanceId = id;
      })
      .on('data', (event) => 
        this._checkLiquidityPool(event.returnValues.tokenAddress),
      );
  }

  async _checkLiquidityPool(pairAddress) {
    console.log(`==========> Checking LP: ${pairAddress} <==========`);
    const pairContract = new this.web3.eth.Contract(pairABI, pairAddress);

    const getTokenA = pairContract.methods.token0();
    const getTokenB = pairContract.methods.token1();

    try {
      const tokenA = await getTokenA.call();
      const tokenB = await getTokenB.call();
      console.log(tokenB);
      await this._checkPairEligible(
        Web3.utils.toChecksumAddress(tokenA),
        Web3.utils.toChecksumAddress(tokenB),
        pairAddress,
      );
    } catch (err) {
      console.log(err);
      console.log(`Not a liquidity pool ${tokenA} ${tokenB}`);
    }
  }

  async _checkPairEligible(tokenA, tokenB, pairAddress) {
    const mappedTokenA = tokenCurrencyMap[tokenA];
    const mappedTokenB = tokenCurrencyMap[tokenB];

    const isEligible =
      (mappedTokenA && !mappedTokenB) || (mappedTokenB && !mappedTokenA);
    
    if (isEligible) {
      const eligibleType = mappedTokenA || mappedTokenB;
      const eligibleToken = currencyTokenMap[eligibleType];
      const counterToken = eligibleToken === tokenA ? tokenB : tokenA;

      const IsNew = await checkIfNew(this.web3, counterToken);
      console.log(IsNew)
      if (!IsNew) {
        console.log("token is old");
        return;
      }
      console.log(`would purchase ${counterToken}`);
      const activeTokens = await models.Token.findActiveTokensByAddress(
        eligibleToken,
      );

      if (isEmpty(activeTokens)) {
        return console.log('==========> No active tokens found <==========');
      }

      const newTokens = await models.Pair.filterPairsToCreate(
        pairAddress,
        activeTokens,
      );

      if (isEmpty(newTokens)) {
        return console.log('==========> No new tokens found <==========');
      }

      const buyPairs = newTokens.map((token) =>
        this._makePurchase(token, { tokenB: counterToken, pairAddress }),
      );

      await Promise.all(buyPairs);

      const purchasedPairs = await models.Pair.findPurchasedPairsByType(
        eligibleToken,
      );

      if (isEmpty(purchasedPairs)) {
        return console.log('==========> No purchased pairs found <==========');
      }

      purchasedPairs.forEach(async (pair) => this._monitor(pair));
    }
  }

  async _makePurchase(token, { tokenB, pairAddress }) {

    const tokenBContract = this._createERC20TokenContract(tokenB);
    let swapTx;
    let pair;
    try {
      swapTx = await this._swap(token, [token.address, tokenB], true);
      console.log(`==========> SWAP TX: ${tokenB} <==========`);
      pair = await models.Pair.createAndReturn({
        tokenId: token.id,
        address: pairAddress,
        status: `Purchased`,// status: approved ? 'Approved' : 'Purchased',
        tokenA: token.address,
        tokenB,
        tokensBought: "0",
        initialPrice: convertBuyAmount(token.address, token.buyAmount).toString(),
        tx: swapTx.transactionHash,
      });
    } catch (error) {
      // if swap fails, we should NOT try to buy again (because prices may drop)
      // cancel this operation and do NOT create pair
      console.log(`purchase failed from: ${token.Wallet.address}`);
      console.log(error);
      return;
    }

    let balance;

    // error handled in this function. We need this to proceed
    balance = await this._getBalanceAndInitialPrice(
      tokenBContract,
      token,
      tokenB,
    );
    console.log(balance);
    console.log(typeof balance);
    if (typeof balance !== "string") {
      const newTime = setInterval(async () => {
        balance = await this._getBalanceAndInitialPrice(
          tokenBContract,
          token,
          tokenB,
        );
        if (typeof balance === "string") {
          await models.Pair.update({
            tokensBought: balance.toString(),
          },
          {
            where: {
              id: pair.id,
            }
          })
          clearInterval(newTime);
        }
      }, 3000)
    }
    // if approval fails here, we should try again at start of monitor callback.
    
    try {
      const toApprove = new BN("9000000000000000000000000000000000000000000000000000000",
      );
      await this._approve(token, tokenB, tokenBContract, toApprove);
      await models.Pair.update({
        status: "Approved",
      },
      {
        where: {
          id: pair.id,
        }
      })
    } catch {
      
      console.log('approval failed');
    }

    return
  }

  async _getBalanceAndInitialPrice(tokenBContract, token, tokenB) {
    try {
      const getBalance = tokenBContract.methods.balanceOf(token.Wallet.address);
      const balance = await getBalance.call();
      return balance.toString();
    } catch {
      return false;
    }
  }

  // if this fails anywhere, the monitor callback fails and tries again next round
  async _sell(pair) {
    console.log(`==========> SELL TX: ${pair.address} <==========`);
    const toSell = new BN(pair.tokensBought)
      .mul(new BN(pair.Token.percentToSell.toString()))
      .div(new BN('100'));
    const paymentToken = this._createERC20TokenContract(pair.tokenA);
    const getBalance = paymentToken.methods.balanceOf(
      pair.Token.Wallet.address,
    );
    const balanceBefore = await getBalance.call();

    const swapTx = await this._swap(
      pair.Token,
      [pair.tokenB, pair.tokenA],
      false,
    );

    const balanceAfter = await getBalance.call();
    // to get profit, we will compare balance before with balance after
    // alternate: call events. a bit uglier.
    const difference = new BN(balanceAfter.toString()).sub(
      new BN(balanceBefore.toString()),
    );
    let profit =
      tokenCurrencyMap[pair.tokenA] === 'USDC'
        ? parseInt(difference) / 1000000
        : Web3.utils.fromWei(difference);
    profit = profit.toString();
    return models.Pair.update(
      {
        amountSold: toSell.toString(),
        profit,
        tx: swapTx.transactionHash,
        status: 'Closed',
      },
      {
        where: {
          id: pair.id,
        },
      },
    );
  }

  async _monitor(pair) {
    if (this.monitorPairs.has(pair.id)) return;

    const intervalId = setInterval(
      bind(this._monitorCallback, this, pair),
      pair.Token.monitorLength, // TODO: Is this the spot where getRandomInterval should be added?
    );

    this.monitorPairs.set(pair.id, {
      intervalId,
      count: 0,
      tries: 0,
      tokenId: pair.tokenId,
    });

    this.tokenIds[pair.tokenId] = this.tokenIds[pair.tokenId] || [];
    this.tokenIds[pair.tokenId].push(pair);
  }
  
  async _monitorCallback(_pair) {
    const pair = await models.Pair.findSinglePairById(_pair.id)
    console.log(typeof pair.tokensBought)
    if (pair.tokensBought === "0") {
      try {
        const tokenBContract = this._createERC20TokenContract(pair.tokenB);
        const getBalance = tokenBContract.methods.balanceOf(pair.Token.Wallet.address);
        const balance = await getBalance.call();

        await models.Pair.update(
          {
            tokensBought: balance.toString(),
          },
          {
            where: {
              id: pair.id,
            }
          }
        )
        console.log("balance updated");
        return;
      } catch {
        console.log("update balance failed");
        return;
      }
    }
    if (pair.status !== 'Approved') {
      
      try {
        console.log(pair)
        const tokenBContract = this._createERC20TokenContract(pair.tokenB);
        const toApprove = new BN(pair.tokensBought.toString()).mul(new BN('2'));
        await this._approve(pair.Token, pair.tokenB, tokenBContract, toApprove);
        await models.Pair.update(
          {
            status: 'Approved',
          },
          {
            where: {
              id: pair.id,
            },
          },
        );
        
      } catch (error) {
        console.log(error)
        console.log('approval failed');
        return;
      }
      
    }
    const monitorInfo = this.monitorPairs.get(pair.id);
    try {
      
      console.log(
        `>>>>>>>>> MONITOR_CALLBACK ${pair.tokenB} & count: ${monitorInfo.count} <<<<<<<<<<`,
      );

      const initialPrice = convertPrice(pair.tokenA, pair.initialPrice);
      const currentValue = await this.routerContract.methods
        .getAmountsOut(pair.tokensBought, [pair.tokenB, pair.tokenA])
        .call();

      const currentPrice = convertPrice(pair.tokenA, currentValue[1]);
      console.log(`initial price: ${initialPrice}`);
      console.log(`currentPrice: ${currentPrice}`);
      console.log(pair.Token.multiplierTarget);
      if (
        parseFloat(currentPrice) >=
        pair.Token.multiplierTarget * parseFloat(initialPrice)
      ) {
        console.log('YES');
        await this._sell(pair);
        console.log('CLEARING 1');
        clearInterval(monitorInfo.intervalId);
        this.monitorPairs.delete(pair.id);
      }

      if (monitorInfo.count >= pair.Token.cyclesToTimeout) {
        console.log('CLEARING 2');
        // await this._sell(pair);
        clearInterval(monitorInfo.intervalId);
        this.monitorPairs.delete(pair.id);

        return models.Pair.update(
          {
            status: 'Expired',
          },
          {
            where: {
              id: pair.id,
            },
          },
        );
      }

      monitorInfo.count = monitorInfo.count + 1;
    } catch (err) {
      console.log(err);
      if (monitorInfo.count >= pair.Token.cyclesToTimeout) {
        clearInterval(monitorInfo.intervalId);
        this.monitorPairs.delete(pair.id);

        return models.Pair.update(
          {
            status: 'Expired',
          },
          {
            where: {
              id: pair.id,
            },
          },
        );
      }
    }
  }

  async _swap(token, path, isBuy) {
    const { address, privateKey } = token.Wallet;
    let toSwap;
    if (isBuy) {
      toSwap = convertBuyAmount(token.address, token.buyAmount);
    } else {
      const contract = this._createERC20TokenContract(path[0]);
      const getBalance = contract.methods.balanceOf(address);
      const balance = await getBalance.call();
      toSwap = new BN(balance)
        .mul(new BN(token.percentToSell.toString()))
        .div(new BN('100'));
    }
    try {
      return await this._swap_(toSwap, path, address, privateKey);
    } catch {
      return await this._swap2_(toSwap, path, address, privateKey);
    }
    
  }

  async _swap_(toSwap, path, address, privateKey) {
    const currentTime = Math.round(Date.now() / 1000);
    const transaction = this.routerContract.methods.swapExactTokensForTokens(
      toSwap.toString(),
      '0',
      path,
      address,
      currentTime + 300,
    );
    const base = await this.web3.eth.getGasPrice();
    const gas = (new BN(base.toString())).add(new BN("4000000000"))
    console.log(gas);
    const signed = await this.web3.eth.accounts.signTransaction(
      {
        to: book.uniswap.router,
        data: transaction.encodeABI(),
        gas: await transaction.estimateGas({ from: address }), // await transaction.estimateGas({ from: address }),
        gasPrice: gas.toString(),
      },
      privateKey,
    );
    console.log('SUCCESS');
    return await this.web3.eth.sendSignedTransaction(signed.rawTransaction);
  }

  async _swap2_(toSwap, path, address, privateKey) {
    const currentTime = Math.round(Date.now() / 1000);
    const transaction = this.routerContract.methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      toSwap.toString(),
      '0',
      path,
      address,
      currentTime + 300,
    );
    const base = await this.web3.eth.getGasPrice();
    const gas = (new BN(base.toString())).add(new BN("4000000000"))
    const signed = await this.web3.eth.accounts.signTransaction(
      {
        to: book.uniswap.router,
        data: transaction.encodeABI(),
        gas: await transaction.estimateGas({ from: address }), // await transaction.estimateGas({ from: address }),
        gasPrice: gas.toString(),
      },
      privateKey,
    );
    console.log('SUCCESS');
    return await this.web3.eth.sendSignedTransaction(signed.rawTransaction);
  }

  // TO DO: lets get balanceOf the token, then approved that amount (+ extra).
  async _approve(token, tokenAddress, tokenContract, amount) {
    const { address, privateKey } = token.Wallet;
    const transaction = tokenContract.methods.approve(
      book.uniswap.router,
      amount.toString(),
    );
    const base = await this.web3.eth.getGasPrice();
    const gas = (new BN(base.toString())).add(new BN("4000000000"))
    const signed = await this.web3.eth.accounts.signTransaction(
      {
        to: tokenAddress,
        data: transaction.encodeABI(),
        gas: await transaction.estimateGas({ from: address }),
        gasPrice: gas.toString(),
      },
      privateKey,
    );
    console.log('APPROVED');
    return await this.web3.eth.sendSignedTransaction(signed.rawTransaction);
  }

  _createERC20TokenContract(tokenAddress) {
    return new this.web3.eth.Contract(erc20ABI, tokenAddress);
  }
}

module.exports = new LockerBot();
