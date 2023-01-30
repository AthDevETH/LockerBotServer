const path = require('path');
const Web3 = require('web3');
const cryptABI = require('../ABI/unicrypt');
const teamLockABI = require('../ABI/teamLockerABI');
const routerABI = require('../ABI/routerABI');
const pairABI = require('../ABI/pairABI');
const erc20ABI = require('../ABI/erc20ABI');
const book = require('../config.js');
const transactions = require('../transactions/transactions');
const { BN } = require('@openzeppelin/test-helpers');
const fs = require('fs');
const socket = require('../index');

const options = {
  reconnect: {
    auto: true,
    delay: 1000,
    maxAttempts: 100,
    onTimeout: false,
  },
};

let web3;

let monitoring = [];
let intervals = [];

let wethBuy;
let usdcBuy;
let usdtBuy;
let daiBuy;

let tradeWeth;
let tradeUsdc;
let tradeDai;
let tradeUsdt;

let multiplier; // to be changed
let percentToSell;
let monitorLength;
let cyclesToTimeout;

let unicryptSub;
let unicryptID;
let teamFinSub;
let teamFinID;

let address;
let rpc = '';

const configPath = path.join(__dirname, '../config/config.json');
const dataPendingPath = path.join(__dirname, '../data/pending.json');

module.exports = {
  setConfigFromStorage: async () => {
    const rawData = await fs.readFileSync(configPath);
    let data = JSON.parse(rawData);

    wethBuy = web3.utils.toWei(data.wethBuyAmount.toString());
    usdcBuy = parseInt(parseFloat(data.usdcBuyAmount) * 1000000);
    usdtBuy = web3.utils.toWei(data.usdtBuyAmount.toString());
    daiBuy = web3.utils.toWei(data.daiBuyAmount.toString());

    tradeWeth = data.tradeWeth;
    tradeUsdc = data.tradeUsdc;
    tradeDai = data.tradeDai;
    tradeUsdt = data.tradeUsdt;

    multiplier = parseFloat(data.multiplierTarget);
    percentToSell = parseFloat(data.percentToSell);
    monitorLength = parseInt(data.monitorLength);
    cyclesToTimeout = parseInt(cyclesToTimeout);

    address = data.address;
    rpc = data.rpc;
  },

  setWeb3: async () => {
    if (rpc === '') {
      web3 = new Web3('');
      return false;
    }
    const provider = new Web3.providers.WebsocketProvider(rpc, options);
    web3 = new Web3(provider);
    return true;
  },

  startUnicrypt: async () => {
    if (rpc === '') {
      return;
    }
    const unicrypt = new web3.eth.Contract(cryptABI, book.lockers.unicrypt);
    unicryptSub = unicrypt.events
      .onDeposit({}, function (error, event) {})
      .on('connected', function (subscriptionId) {
        unicryptID = subscriptionId;
      })
      .on('data', function (event) {
        checkPair(event.returnValues.lpToken); // same results as the optional callback above
        console.log('hit');
      })
      .on('changed', function (event) {
        // remove event from local database
      })
      .on('error', function (error, receipt) {
        // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
      });
    console.log('starting unicrypt');
    socket.startListening('Unicrypt Online');
  },

  startTeamFin: async () => {
    if (rpc === '') {
      return;
    }

    const teamFinLocker = new web3.eth.Contract(
      teamLockABI,
      book.lockers.teamFin,
    );

    teamFinSub = teamFinLocker.events
      .Deposit({}, function (error, event) {})
      .on('connected', function (subscriptionId) {
        teamFinID = subscriptionId;
      })
      .on('data', function (event) {
        checkPair(event.returnValues.tokenAddress); // same results as the optional callback above
        console.log('hit');
      })
      .on('changed', function (event) {
        // remove event from local database
      })
      .on('error', function (error, receipt) {
        // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
      });
    console.log('starting teamFin');
    socket.startListening('TeamFin Online');
  },

  unsubscribeUnicrypt: async () => {
    if (!unicryptID) {
      return;
    }
    unicryptSub.options.requestManager.removeSubscription(unicryptID);
    socket.stopListening('Unicrypt Offline');
    console.log('unsubscribed unicrypt');
  },

  unsubscribeTeamFin: async () => {
    if (!teamFinID) {
      return;
    }
    teamFinSub.options.requestManager.removeSubscription(teamFinID);
    socket.stopListening('teamFin Offline');
    console.log('unsubscribed teamFin');
  },

  resumePendingPairs: async () => {
    if (rpc === '') {
      return;
    }
    console.log('running');
    if (intervals.length !== 0) return;
    const rawRecords = await fs.readFileSync(dataPendingPath);
    let records = JSON.parse(rawRecords);
    if (records.length > 0) {
      for (let i = 0; i < records.length; i++) {
        let flag = false;
        if (records[i].type === 'usdc') {
          flag = true;
        }
        if (
          records[i].amountSold.toString() ===
          '0' /*&& records[i].public === public*/
        ) {
          monitoring.push(records[i].pair);
          let test = true;
          if (records[i].user !== 'TEST') {
            test = false;
          }
          monitor(records[i].path, records[i].pair, flag, test);
        }
      }
    }
  },

  clearTimers: async () => {
    if (intervals.length > 0) {
      for (let i = 0; i < intervals.length; i++) {
        clearInterval(intervals[i]);
      }
      intervals.splice(0, intervals.length);
      monitoring.splice(0, monitoring.length);
    }
    console.log('cleared timers');
    socket.stopListening('cleared all timers');
  },

  getListOfMonitors: () => {
    return monitoring;
  },
};

const checkPair = async (addr) => {
  const pair = new web3.eth.Contract(pairABI, addr);
  let isValid = false;
  const getToken0 = pair.methods.token0();
  const getToken1 = pair.methods.token1();
  let token1;
  let token0;
  try {
    token0 = await getToken0.call();
    token1 = await getToken1.call();
    isValid = true;
  } catch {
    console.log('not a liquidity pool');
  }
  if (isValid) {
    isPairEligible(token0, token1, addr);
  }
};

const isPairEligible = async (token0, token1, pair) => {
  let bigTokens = [];
  if (tradeWeth) {
    bigTokens.push(book.tokens.weth);
  }
  if (tradeUsdc) {
    bigTokens.push(book.tokens.usdc);
  }
  if (tradeUsdt) {
    bigTokens.push(book.tokens.usdt);
  }
  if (tradeDai) {
    bigTokens.push(book.tokens.dai);
  }

  let path = [];
  if (bigTokens.includes(token0) && !bigTokens.includes(token1)) {
    path.push(token0);
    path.push(token1);
  } else if (bigTokens.includes(token1) && !bigTokens.includes(token0)) {
    path.push(token1);
    path.push(token0);
  }

  if (path.length == 2 && !monitoring.includes(pair)) {
    monitoring.push(pair);
    console.log(`starting monitor: ${pair}`);

    const rawRecords = await fs.readFileSync(dataPendingPath);
    let records = JSON.parse(rawRecords);
    let exists = false;
    for (let i = 0; i < records.length; i++) {
      if (records[i].pair == pair) {
        exists = true;
      }
    }
    if (!exists) {
      makePurchase(path, pair);
    }
  }
};

const makePurchase = async (path, pair) => {
  let purchaseAmt;
  let isUSDC = false;
  let type;
  if (path[0] == book.tokens.weth) {
    purchaseAmt = wethBuy;
    type = 'weth';
  } else if (path[0] == book.tokens.usdc) {
    purchaseAmt = usdcBuy;
    isUSDC = true;
    type = 'usdc';
  } else if (path[0] == book.tokens.dai) {
    purchaseAmt = daiBuy;
    type = 'dai';
  } else if (path[0] == book.tokens.usdt) {
    purchaseAmt = usdtBuy;
    type = 'usdt';
  }

  const rawData = await fs.readFileSync(configPath);
  let data = JSON.parse(rawData);
  const router = new web3.eth.Contract(routerABI, book.uniswap.router);
  if (data.privateKey !== '') {
    try {
      const tx = await transactions.swap(purchaseAmt, path);
      await transactions.approve(path[1]);
      const newToken = new web3.eth.Contract(erc20ABI, path[1]);
      const getBalance = newToken.methods.balanceOf(data.address);
      const balance = await getBalance.call();
      const rawPairs = await fs.readFileSync(dataPendingPath);
      let pairData = JSON.parse(rawPairs);
      const toSave = {
        user: address,
        pair: pair,
        path: path,
        tokensBought: balance.toString(),
        purchaseAmt: purchaseAmt,
        type: type,
        amountSold: 0,
        tx: [tx.transactionHash],
      };
      pairData.push(toSave);
      await fs.writeFileSync(
        dataPendingPath,
        JSON.stringify(pairData, null, 2),
      );
      monitor(path, pair, isUSDC, false);
    } catch {
      console.log('swap failed - run dry');
      const getAmountsOut = router.methods.getAmountsOut(purchaseAmt, path);
      const amountOut = await getAmountsOut.call();
      const rawPairs = await fs.readFileSync(dataPendingPath);
      let pairData = JSON.parse(rawPairs);
      const toSave = {
        user: address,
        pair: pair,
        path: path,
        tokensBought: amountOut[1].toString(),
        purchaseAmt: purchaseAmt,
        type: type,
        amountSold: 0,
        tx: ['test-buy'],
      };
      pairData.push(toSave);
      await fs.writeFileSync(
        dataPendingPath,
        JSON.stringify(pairData, null, 2),
      );
      monitor(path, pair, isUSDC, true);
    }
  } else {
    // without private key
    console.log('no private key run');
    const getAmountsOut = router.methods.getAmountsOut(purchaseAmt, path);
    const amountOut = await getAmountsOut.call();
    const rawPairs = await fs.readFileSync(dataPendingPath);
    let pairData = JSON.parse(rawPairs);
    const toSave = {
      user: 'TEST',
      pair: pair,
      path: path,
      tokensBought: amountOut[1].toString(),
      purchaseAmt: purchaseAmt,
      type: type,
      amountSold: 0,
      profit: 0,
      tx: ['test-buy'],
    };
    pairData.push(toSave);
    await fs.writeFileSync(dataPendingPath, JSON.stringify(pairData, null, 2));
    monitor(path, pair, isUSDC, true);
  }
};

const monitor = async (path, pair, isUSDC, dry) => {
  console.log(`running ${pair}`);
  socket.newPair(pair.toString());
  const router = new web3.eth.Contract(routerABI, book.uniswap.router);
  const rawPairs = await fs.readFileSync(dataPendingPath);
  let pairData = JSON.parse(rawPairs);
  let setLoc;
  for (let i = 0; i < pairData.length; i++) {
    if (pairData[i].pair === pair) {
      setLoc = i;
      break;
    }
  }

  const sellPath = [path[1], path[0]];
  const amountToGoIn = pairData[setLoc].tokensBought.toString();
  const getAmountsOut = router.methods.getAmountsOut(amountToGoIn, sellPath);
  const amountOut = await getAmountsOut.call();

  let initialValue = amountOut[1];
  if (isUSDC) {
    initialValue = parseInt(initialValue);
  } else {
    initialValue = web3.utils.fromWei(initialValue.toString());
    initialValue = parseFloat(initialValue).toFixed(4);
  }

  let count = 0;
  const interval = setInterval(async () => {
    let currentPrice;
    try {
      currentPrice = await getAmountsOut.call();
    } catch {
      console.log('rpc error');
      return;
    }

    let price;
    if (isUSDC) {
      price = parseInt(currentPrice[1]);
    } else {
      price = web3.utils.fromWei(currentPrice[1].toString());
      price = parseFloat(price).toFixed(4);
    }

    if (price >= multiplier * initialValue) {
      // sell half here
      console.log('Selling');
      const rawData = await fs.readFileSync(dataPendingPath);
      let data = JSON.parse(rawData);
      // if (data.publicKey !== pairData[setLoc].public) {
      //     clearInterval(interval);
      //     return;
      // }
      console.log(`selling token ${sellPath[0]}`);
      let toSell = new BN(data[setLoc].tokensBought.toString());
      toSell = toSell.mul(new BN(percentToSell.toString())).div(new BN('100'));
      if (!dry) {
        try {
          const tx = await transactions.swap(toSell, sellPath);
          const getSaleAmount = router.methods.getAmountsOut(toSell, sellPath);
          let profit = await getSaleAmount.call();
          profit = profit[1];
          if (isUSDC) {
            profit = profit / 1000000;
          } else {
            profit = web3.utils.fromWei(profit);
          }
          const rawNewData = await fs.readFileSync(dataPendingPath);
          let newData = JSON.parse(rawNewData);
          newData[setLoc].amountSold = toSell;
          newData[setLoc].profit = profit;
          newData[setLoc].tx.push(tx.transactionHash);
          await fs.writeFileSync(
            dataPendingPath,
            JSON.stringify(newData, null, 2),
          );
          for (let b = 0; b < monitoring.length; b++) {
            if (monitoring[b] == pair) {
              monitoring.splice(b, 1);
              break;
            }
          }
          clearInterval(interval);
        } catch {
          console.log('failed swap');
        }
      } else {
        try {
          const getSaleAmount = router.methods.getAmountsOut(toSell, sellPath);
          let profit = await getSaleAmount.call();
          profit = profit[1];
          if (isUSDC) {
            profit = profit / 1000000;
          } else {
            profit = web3.utils.fromWei(profit);
          }
          const rawNewData = await fs.readFileSync(dataPendingPath);
          let newData = JSON.parse(rawNewData);
          newData[setLoc].amountSold = toSell;
          newData[setLoc].profit = profit;
          newData[setLoc].tx.push(`Test Sell`);
          await fs.writeFileSync(
            dataPendingPath,
            JSON.stringify(newData, null, 2),
          );
          for (let b = 0; b < monitoring.length; b++) {
            if (monitoring[b] == pair) {
              monitoring.splice(b, 1);
              break;
            }
          }
          clearInterval(interval);
        } catch (error) {
          console.log(error);
        }
      }
    }
    if (count >= cyclesToTimeout) {
      clearInterval(interval);
    }
    count++;
  }, monitorLength);
  intervals.push(interval);
};
