const bind = require("lodash/bind");
const isEmpty = require("lodash/isEmpty");
const Web3 = require("web3");
// const ethers = require("ethers");
const { BN } = require("@openzeppelin/test-helpers");
const web3Pool = require("./web3Pool");
const { models } = require("./storage");
const events = require("./events");
const Transactions = require("./transactions");
const unicryptABI = require("../ABI/unicrypt");
const teamFinanceABI = require("../ABI/teamLockerABI");
const routerABI = require("../ABI/routerABI");
const pairABI = require("../ABI/pairABI");
const factoryABI = require("../ABI/factoryABI");
const book = require("../config");
const erc20ABI = require("../ABI/erc20ABI");
const getRandomInterval = require("../utils/getRandomInterval");
const { TransactionError } = require("../utils/errors");
const convertPrice = require("../utils/convertPrice");
const convertBuyAmount = require("../utils/convertBuyAmount");
const tokenCurrencyMap = require("../constants/tokenCurrencyMap");
const currencyTokenMap = require("../constants/currencyTokenMap");
const miscConstants = require("../constants/misc");
const checkIfNew = require("./checkOldToken");

const { Api, TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");

class LockerBot {
  sellingPairId = {};

  constructor() {
    this.web3 = {
      1: web3Pool.getNode(1),
      56: web3Pool.getNode(56),
    };
    this.mevWeb3 = web3Pool.getMevProtectectionWeb3();
    this.unicryptContract = {};
    this.teamFinanceContract = {};
    this.telegramContract = {};
    this.routerContract = {
      1: null,
      56: null,
    };
    this.tokenIds = {};
    this.monitorPairs = new Map();
    this.unicryptId = {};
    this.teamFinanceId = {};
    this.telegramId = {};
    this.events = events;
    this.telegramClient = TelegramClient;
    this.factoryContract = {
      1: null,
      56: null,
    };
    this.eventHandlerIdentifier = 'channelMonitoring'
    this.eventHandlerObject = {};
    this.slippageValue = 1000; // Default slippage amount 1000 = 10%
  }

  async initTelegramSession() {
    (async () => {
      console.log("Create a session...");

      // will have to join the specific channels

      const apiId = Number(process.env.API_ID); // get this value from my.telegram.org/apps
      const apiHash = process.env.API_HASH; // get this value from my.telegram.org/apps
      const stringSession = new StringSession(process.env.SESSION); // fill this later with the value from session.save()

      this.client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
      });

      await this.client.start({
        phoneNumber: async () => await input.text("Please enter your number: "),
        password: async () => await input.text("Please enter your password: "),
        phoneCode: async () =>
          await input.text("Please enter the code you received: "),
        onError: (err) => console.log(err),
      });

      console.log("You should now be connected.");
      console.log(this.client.session.save()); // Save this string to avoid logging in again
    })();
  }

  async init() {
    console.log("starting");
    await this.initPairsMonitoring();
    console.log("starting 1");
    await this.initContracts();
    console.log("starting 2");
    await this.telegramTrackingSetup();
    console.log("starting 3");
    // await this.initTelegram();

    this.routerContract = {
      1: new this.mevWeb3[1].eth.Contract(
        routerABI,
        book.networks[1].uniswap.router
      ),
      56: new this.web3[56].eth.Contract(
        routerABI,
        book.networks[56].uniswap.router
      ),
    };

    this.factoryContract = {
      1: new this.web3[1].eth.Contract(
        factoryABI,
        book.networks[1].uniswap.factory
      ),
      56: new this.web3[56].eth.Contract(
        factoryABI,
        book.networks[56].uniswap.factory
      ),
    };

    this.events.subscribe(
      this.events.WALLET_CHANGED_EVENT,
      this.checkContracts.bind(this)
    );

    this.events.subscribe(
      this.events.TRIGGER_CHANNEL_EVENT,
      async () => {
        console.log("TRIGGER_CHANNEL_EVENT_PROCESSING");
        // RESTARTS TELEGRAM MONITORING
        const allChannels = await models.Channels.findActiveChannels();
        const activeChannels = await this.getActiveChannels();
        const finalChannels = await this.getFinalChannels(activeChannels);
        const chainIds = await this.getChainIds(allChannels);

        await this.telegramRemoveEventHandlers();

        if(finalChannels.length > 0){
          await this.telegramAddEventHandlers(chainIds, finalChannels);
        }
        await this.telegramEventHandlers();
      }
      // this.telegramTrackingSetup.bind(this)
    );

    this.events.subscribe(
      this.events.TOKEN_CHANGED_EVENT,
      async ({ tokenId }) => {
        console.log("TOKEN_CHANGED_EVENT_PROCESSING >>>>>>>> " + tokenId);
        const pairsByTokenId = this.tokenIds[tokenId];
        console.log("tokenId", tokenId);
        if (pairsByTokenId) {
          for (const pair of pairsByTokenId) {
            const monitorInfo = this.monitorPairs.get(pair.id);
            monitorInfo.eventEmitter.options.requestManager.removeSubscription(
              monitorInfo.subcriptionId
            );

            this.monitorPairs.delete(pair.id);
          }
        }

        delete this.tokenIds[tokenId];

        const pairs = await models.Pair.findAllPurchasedPairsByTokenId(tokenId);
        pairs.forEach((pair) => this._monitor(pair));
      }
    );

    this.events.subscribe(this.events.TRIGGER_SALE_EVENT, async (pair) => {
      // we should check if monitor is not attempting a sale at this time too. Would probably need new tracking variable for it

      try {
        const tokenContract = this._createERC20TokenContract(
          pair.tokenB,
          pair.Token.Wallet.chainId
        );
        const paymentContract = this._createERC20TokenContract(
          pair.tokenA,
          pair.Token.Wallet.chainId
        );
        const getPaymentBalance = paymentContract.methods.balanceOf(
          pair.Token.Wallet.address
        );
        const getBalance = tokenContract.methods.balanceOf(
          pair.Token.Wallet.address
        );
        const toSwap = await getBalance.call();
        await this._swap_(
          toSwap,
          [pair.tokenB, pair.tokenA],
          pair.Token.Wallet.address,
          pair.Token.Wallet.privateKey,
          pair.Token.Wallet.chainId
        );
        console.log("swapped");
        const paymentAfter = await getPaymentBalance.call();
        const profit = new BN(paymentAfter.toString()).sub(
          new BN(paymentBefore.toString())
        );
        const totalProfit = new BN(pair.profit.toString()).add(profit);

        try {
          const monitorInfo = this.monitorPairs.get(pair.id);
          console.log(monitorInfo);

          monitorInfo.eventEmitter.options.requestManager.removeSubscription(
            monitorInfo.subcriptionId
          );

          this.monitorPairs.delete(pair.id);
        } catch {
          console.log("monitor not running");
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
          }
        );
      } catch {
        return pair;
      }
    });

    this.events.subscribe(this.events.TRIGGER_APPROVE_EVENT, async (token) => {
      try {
        const contract = this._createERC20TokenContract(
          token.address,
          token.Wallet.chainId
        );

        await this._approve(
          token,
          token.address,
          contract,
          miscConstants.MAX_UINT_256
        );
      } catch (err) {
        throw new TransactionError(err.message);
      }
      return true;
    });

    this.events.subscribe(
      this.events.TRIGGER_SLIPPAGE_EVENT,
      async (slippage) => {
        console.log("TRIGGER_SLIPPAGE_EVENT_PROCESSING");
      }
    )
  }

  async initContracts() {
    await this.checkContracts();
  }

  async telegramEventHandlers() {
    const events = this.client.listEventHandlers();
    console.log("events: ", events);
  }

  async telegramRemoveEventHandlers() {
    try {
      const eventHandler = this.eventHandlerObject;
      this.client.removeEventHandler(
        eventHandler
      );
    } catch (e) {
      console.log("Error: ", e.message);
    }
  }

  async telegramAddEventHandlers(chainIds, finalChannels) {
    try {
      const eventHandler = async (events) => {
        this.msgAddressMonitor(events, chainIds)
      }
      this.eventHandlerObject = eventHandler;
      this.client.addEventHandler(
        eventHandler, 
        new NewMessage({ chats: finalChannels },
        this.eventHandlerIdentifier    
      )
      );
    } catch (e) {
      console.log("Error: ", e.message);
    }
  }

  async msgAddressMonitor(event, chainIds){
    const addressRegex = /\b0x[a-fA-F0-9]{40}\b/g;
    let addresses = [];

    const allChannels = await models.Channels.findActiveChannels();
    const chainIds2 = await this.getChainIds(allChannels);


    let msg = event.message.message;
    console.log("msg: ", msg);
    
    let resp = msg.match(addressRegex);
    if (resp) {
      addresses = [];
      addresses = addresses.concat(resp);
      addresses = [...new Set(addresses)];
      const result = await this._checkIfLPToken(addresses, chainIds2);
      
      let sender = await event.message.getSender();
      sender = sender.username;
      
      const text = {
          sender: sender,
          msg: msg,
      }

      if (result.length != 0) {
        for (let i = 0; i < result.length; i++) {
          this._checkLiquidityPool(
            result[i].addressRetrieved,
            result[i].chain,
            text
          );
        }
      }
    }
  }

  async getFinalChannels(activeChannels) {
    let finalChannels = [];

    for (const channels of activeChannels) {
      let error = false;
      try {
        const exists = await this.client.invoke(
          new Api.channels.GetChannels({
            id: ["@" + channels],
          })
        );
      } catch (e) {
        console.log("Error: ", e.message);
        error = true;
      }

      if (error === true) continue;

      try {
        await this.client.invoke(
          new Api.channels.GetParticipant({
            channel: "@" + channels,
            participant: "@unipcstgbot",
          })
        );
      } catch (e) {
        console.log("Error: ", e);

        if (
          e.message ==
          "400: USER_NOT_PARTICIPANT (caused by channels.GetParticipant)"
        ) {
          console.log("Adding User to Channel");
          try {
            await this.client.invoke(
              new Api.channels.JoinChannel({
                channel: "@" + channels,
              })
            );
          } catch (e) {
            console.log("Error: ", e.message);
          }
        }
      }
      finalChannels.push("@" + channels);
    }

    return finalChannels;
  }

  async getActiveChannels() {
    const allChannels = await models.Channels.findActiveChannels();
    let activeChannels = [];

    for (let i = 0; i < allChannels.length; i++) {
      // Status = Active && Closed
      if (allChannels[i].status == "Active") {
        activeChannels.push(allChannels[i].name);
      }
    }

    return activeChannels;
  }

  async getChainIds(allChannels) {
    let startTelegramChainId = [];

    for (const channel of allChannels) {
      if (channel.startTelegram) {
        startTelegramChainId.push(channel.Wallet.chainId); // create table for telegram
      }
    }

    return startTelegramChainId;
  }

  async telegramTrackingSetup() {
    const allChannels = await models.Channels.findActiveChannels();

    let activeChannelsList = await this.getActiveChannels();
    let startTelegramChainId = await this.getChainIds(allChannels);

    if(activeChannelsList.length > 0){
      await this.monitorTelegramAddresses(startTelegramChainId, activeChannelsList);
      // await this.telegramEventHandlers();
    }
  }

  async checkContracts() {
    const activeWallets = await models.Wallet.findActiveWallets();
    console.log("Total activeWallets:", activeWallets.length);

    let startUnicryptChainId = new Set(),
      startTeamfinChainId = new Set(),
      startTelegramChainId = new Set();

    for (const wallet of activeWallets) {
      if (wallet.startUnicrypt) {
        startUnicryptChainId.add(wallet.chainId);
      }
      if (wallet.startTeamFin) {
        startTeamfinChainId.add(wallet.chainId);
      }
      if (wallet.startTelegram) {
        startTelegramChainId.add(wallet.chainId);
      }
    }

    console.log("startUnicrypt", startUnicryptChainId.length != 0);
    console.log("startTeamFin", startTeamfinChainId.length != 0);

    this.initUnicrypt(Array.from(startUnicryptChainId));
    this.initTeamFinance(Array.from(startTeamfinChainId));
  }

  initUnicrypt(chainIds) {
    const chainIdsToRemove = book.supportedChainIds.filter(function (obj) {
      return chainIds.indexOf(obj) == -1;
    });

    // Unsubscribing
    for (const chainIdToRemove of chainIdsToRemove) {
      if (
        this.unicryptContract[chainIdToRemove] &&
        this.unicryptContract[chainIdToRemove].options
      ) {
        this.unicryptContract[
          chainIdToRemove
        ].options.requestManager.removeSubscription(
          this.unicryptId[chainIdToRemove]
        );

        this.unicryptContract[chainIdToRemove] = null;
        return;
      }
    }

    // Subscribing
    for (const chainId of chainIds) {
      console.log("online unicrypt on chainId:", chainId);
      this.unicryptContract[chainId] = new this.web3[chainId].eth.Contract(
        unicryptABI,
        book.networks[chainId].lockers.unicrypt
      );

      this.unicryptContract[chainId].events
        .onDeposit({}, function (error, event) {
          console.log("Error connecting to unicrypt", error);
        })
        .on("connected", (id) => {
          console.log("connected unicryptContract", id);
          this.unicryptId[chainId] = id;
        })
        .on("data", (event) => {
          console.log(`data on chainId: ${chainId} `, event);
          this._checkLiquidityPool(event.returnValues.lpToken, chainId);
        });
    }
  }

  initTeamFinance(chainIds) {
    const chainIdsToRemove = book.supportedChainIds.filter(function (obj) {
      return chainIds.indexOf(obj) == -1;
    });

    // Unsubscribing
    for (const chainIdToRemove of chainIdsToRemove) {
      if (
        this.teamFinanceContract[chainIdToRemove] &&
        this.teamFinanceContract[chainIdToRemove].options
      ) {
        this.teamFinanceContract[
          chainIdToRemove
        ].options.requestManager.removeSubscription(
          this.teamFinanceId[chainIdToRemove]
        );

        this.teamFinanceContract[chainIdToRemove] = null;
        return;
      }
    }

    // Subscribing
    for (const chainId of chainIds) {
      console.log("online teamfin on chainId:", chainId);
      this.teamFinanceContract[chainId] = new this.web3[chainId].eth.Contract(
        teamFinanceABI,
        book.networks[chainId].lockers.teamFin
      );

      this.teamFinanceContract[chainId].events
        .Deposit({}, function (error, event) {
          console.log("Error connecting to teamfinance", error);
        })
        .on("connected", (id) => {
          console.log("connected teamfin", id);
          this.teamFinanceId[chainId] = id;
        })
        .on("data", (event) => {
          this._checkLiquidityPool(event.returnValues.tokenAddress, chainId);
        });
    }
  }

  async monitorTelegramAddresses(chainIds, activeChannels) {
    let finalChannels = await this.getFinalChannels(activeChannels);

    await this.telegramAddEventHandlers(chainIds, finalChannels);

    console.log("finalChannels", finalChannels);
  }

  async _checkLiquidityPool(pairAddress, chainId, text) {
    console.log(`==========> Checking LP: ${pairAddress} <==========`);
    const pairContract = new this.web3[chainId].eth.Contract(
      pairABI,
      pairAddress
    );

    const getTokenA = pairContract.methods.token0();
    const getTokenB = pairContract.methods.token1();
    let tokenA, tokenB;
    try {
      tokenA = await getTokenA.call();
      tokenB = await getTokenB.call();
      await this._checkPairEligible(
        Web3.utils.toChecksumAddress(tokenA),
        Web3.utils.toChecksumAddress(tokenB),
        pairAddress,
        chainId,
        text
      );
    } catch (err) {
      console.log(err);
      console.log(
        `Not a liquidity pool on chainId: ${chainId} pairAddress: ${pairAddress}, tokenA: ${tokenA}, tokenB: ${tokenB}, timestamp: ${Date.now()}`
      );
    }
  }

  async _checkPairEligible(tokenA, tokenB, pairAddress, chainId, text) {
    const mappedTokenA = tokenCurrencyMap[chainId][tokenA];
    const mappedTokenB = tokenCurrencyMap[chainId][tokenB];

    const isEligible =
      (mappedTokenA && !mappedTokenB) || (mappedTokenB && !mappedTokenA);

    if (isEligible) {
      const eligibleType = mappedTokenA || mappedTokenB;
      const eligibleToken = currencyTokenMap[chainId][eligibleType];
      const counterToken = eligibleToken === tokenA ? tokenB : tokenA;

      const IsNew = await checkIfNew(this.web3[chainId], counterToken, chainId);
      console.log(IsNew);
      if (!IsNew) {
        console.log("token is old");
        return;
      }
      console.log(`would purchase ${counterToken}`);
      const activeTokens = await models.Token.findActiveTokensByAddress(
        eligibleToken
      );

      if (isEmpty(activeTokens)) {
        return console.log("==========> No active tokens found <==========");
      }

      const newTokens = await models.Pair.filterPairsToCreate(
        pairAddress,
        activeTokens
      );

      if (isEmpty(newTokens)) {
        return console.log("==========> No new tokens found <==========");
      }

      const msgInfo = {
        tokenA: tokenA,
        text: text,
      };

      const buyPairs = newTokens.map((token) =>
        this._makePurchase(
          token,
          { tokenB: counterToken, pairAddress },
          chainId,
          msgInfo
        )
      );

      await Promise.all(buyPairs);

      const purchasedPairs = await models.Pair.findPurchasedPairsByType(
        eligibleToken
      );

      if (isEmpty(purchasedPairs)) {
        return console.log("==========> No purchased pairs found <==========");
      }
      console.log("eligibleToken", eligibleToken);

      console.log("total purchasedPairs:", purchasedPairs.length);

      purchasedPairs.forEach(async (pair) => {
        this._monitor(pair);
      });
    }
  }

  async _logTokenPurchased(chainId, pairAddress, tokenA, tokenB, text, swapTx) {
    const message = `From Channel: @${text.sender} \n\n MSG: ${text.msg} \n\n Token purchase executed on chainId: ${chainId} \n\n pairAddress: https://etherscan.io/address/${pairAddress} \n\n tokenA: https://etherscan.io/address/${tokenA} \n tokenB: https://etherscan.io/address/${tokenB} \n\n Swap Transaction Hash: https://etherscan.io/tx/${swapTx} \n\n Timestamp: ${new Date(Date.now())}`;

    await this.client.sendMessage(-1001984948663, {
      message: message,
    })
  }

  async _logTokenPurchaseFailed(info){
    const message = `Token Purchase Failed \n\n From Channel: @${info.channel}  \n\n ERROR: ${info.error} \n\n Wallet Address: https://etherscan.io/address/${info.walletAddress} \n\n Token Purchasing: https://etherscan.io/address/${info.tokenB} \n\n Pair Address: https://etherscan.io/address/${info.pairAddress} \n\n ChainID: ${info.chainId} \n\n Timestamp: ${new Date(Date.now())}`;
    
    await this.client.sendMessage(-1001984948663, {
      message: message,
    })
  }

  async _makePurchase(token, { tokenB, pairAddress }, chainId, msgInfo) {
    const tokenBContract = this._createERC20TokenContract(tokenB, chainId);
    let swapTx;
    let pair;
    try {
      swapTx = await this._swap(token, [token.address, tokenB], true);
      console.log(`==========> SWAP TX: ${tokenB} <==========`);
      pair = await models.Pair.createAndReturn({
        tokenId: token.id,
        address: pairAddress,
        status: `Purchased`, // status: approved ? 'Approved' : 'Purchased',
        tokenA: token.address,
        tokenB,
        tokensBought: "0",
        initialPrice: convertBuyAmount(
          token.address,
          token.buyAmount
        ).toString(),
        tx: swapTx.transactionHash,
      });

      await this._logTokenPurchased(chainId, pairAddress, msgInfo.tokenA, tokenB, msgInfo.text, swapTx.transactionHash);

    } catch (error) {
      // if swap fails, we should NOT try to buy again (because prices may drop)
      // cancel this operation and do NOT create pair
      console.log(`purchase failed from: ${token.Wallet.address}`);

      const info = {
        channel: msgInfo.text.sender,
        walletAddress: token.Wallet.address,
        tokenB: tokenB,
        pairAddress: pairAddress,
        chainId: chainId,
        error: error.message,
      }

      await this._logTokenPurchaseFailed(info);
      console.log(error);
      return;
    }

    let balance;

    // error handled in this function. We need this to proceed
    balance = await this._getBalanceAndInitialPrice(
      tokenBContract,
      token,
      tokenB
    );
    console.log("_getBalanceAndInitialPrice", balance);
    console.log("typeof balance", typeof balance);
    if (typeof balance !== "string") {
      const newTime = setInterval(async () => {
        balance = await this._getBalanceAndInitialPrice(
          tokenBContract,
          token,
          tokenB
        );
        if (typeof balance === "string") {
          await models.Pair.update(
            {
              tokensBought: balance.toString(),
            },
            {
              where: {
                id: pair.id,
              },
            }
          );
          clearInterval(newTime);
        }
      }, 3000);
    }
    // if approval fails here, we should try again at start of monitor callback.
    try {
      const toApprove = new BN(miscConstants.MAX_UINT_256);
      await this._approve(token, tokenB, tokenBContract, toApprove);
      await models.Pair.update(
        {
          qstatus: "Approved",
        },
        {
          where: {
            id: pair.id,
          },
        }
      );
    } catch {
      console.log("approval failed");
    }

    return;
  }

  async initPairsMonitoring() {
    console.log("inside initPairsMonitoring");
    const pairs = await models.Pair.findAllPurchasedPairs();

    for (const pair of pairs) {
      this._monitor(pair);
    }
  }

  async _monitor(pair) {
    if (this.monitorPairs.has(pair.id)) return;
    const chainId = pair.Token.Wallet.chainId;
    const pairContract = new this.web3[chainId].eth.Contract(
      pairABI,
      pair.address
    );

    const pairEventSubscription = {
      eventEmitter: null,
      subcriptionId: null,
      pair,
      approving: false,
      insideMonitoringCallback: false,
    };

    pairEventSubscription.eventEmitter = pairContract.events
      .Swap({}, function (error, event) {})
      .on("connected", (id) => {
        console.log("connected pair swap event on lp token: ", pair.address);
        pairEventSubscription.subcriptionId = id;
      })
      .on("data", (event) => {
        this._monitorCallback(pair);
      });

    this.monitorPairs.set(pair.id, pairEventSubscription);

    // this.tokenIds[pair.tokenId] = this.tokenIds[pair.tokenId] || [];
    // this.tokenIds[pair.tokenId].push(pair);
  }

  async _monitorCallback(_pair) {
    const pair = await models.Pair.findSinglePairById(_pair.id);
    const monitorInfo = this.monitorPairs.get(pair.id);
    if (pair.status === "Closed") {
      console.log("Pair status is closed for:", pair.address);
      console.log("Wallet Address:", pair.Token.Wallet.address);
      return;
    }

    if (monitorInfo.insideMonitoringCallback) {
      console.log("Monitor callback is already being executed:", pair.id);
      return;
    }
    const chainId = pair.Token.Wallet.chainId;
    monitorInfo.insideMonitoringCallback = true;

    if (pair.tokensBought === "0") {
      try {
        const tokenBContract = this._createERC20TokenContract(
          pair.tokenB,
          chainId
        );
        const getBalance = tokenBContract.methods.balanceOf(
          pair.Token.Wallet.address
        );
        const balance = await getBalance.call();
        pair.tokensBought = balance.toString();
        await models.Pair.update(
          {
            tokensBought: balance.toString(),
          },
          {
            where: {
              id: pair.id,
            },
          }
        );
        console.log("balance updated");
      } catch {
        console.log("update balance failed");
        monitorInfo.insideMonitoringCallback = false;

        return;
      }
    }

    try {
      console.log(`>>>>>>>>> MONITOR_CALLBACK ${pair.address}  <<<<<<<<<<`);

      const initialPrice = convertPrice(pair.tokenA, pair.initialPrice);
      const currentValue = await this.routerContract[chainId].methods
        .getAmountsOut(pair.tokensBought, [pair.tokenB, pair.tokenA])
        .call();

      const currentPrice = convertPrice(pair.tokenA, currentValue[1]);
      console.log(`initial price: ${initialPrice}`);
      console.log(`currentPrice: ${currentPrice}`);
      console.log("multiplierTarget:", pair.Token.multiplierTarget);
      if (
        parseFloat(currentPrice) >=
        pair.Token.multiplierTarget * parseFloat(initialPrice)
      ) {
        console.log("YES SELL");
        await this._sell(pair, chainId);
        monitorInfo.eventEmitter.options.requestManager.removeSubscription(
          monitorInfo.subcriptionId
        );
        this.monitorPairs.delete(pair.id);
        console.log("CLEARING 1");
      }
    } catch (err) {
      console.log(err);
    }

    monitorInfo.insideMonitoringCallback = false;
  }

  async _logTokenSold(sellInfo){
    const message = `Token Sold Successfully \n\n Token PairSold: https://etherscan.io/address/${sellInfo.pairAddress} \n\n TokenA: https://etherscan.io/address/${sellInfo.tokenA} \n TokenB: https://etherscan.io/address/${sellInfo.tokenB} \n\n Swap TX: https://etherscan.io/tx/${sellInfo.swapTx} \n\n Timestamp: ${new Date(Date.now())}`;
  
    await this.client.sendMessage(-1001984948663, {
      message: message,
    })
  }

  async _logTokenSellFailed(sellInfo){
    const message = `Token Sell Failed \n\n Error: ${sellInfo.error} \n\n Token Pair: https://etherscan.io/address/${sellInfo.pairAddress} \n\n TokenA: https://etherscan.io/address/${sellInfo.tokenA} \n TokenB: https://etherscan.io/address/${sellInfo.tokenB} \n\n Timestamp: ${new Date(Date.now())}`;
  
    await this.client.sendMessage(-1001984948663, {
      message: message,
    })
  }

  async _sell(pair, chainId) {
    if (this.sellingPairId[pair.id]) {
      console.log("Already selling this pair");
      return;
    }
    this.sellingPairId[pair.id] = true;
    console.log(`==========> SELL TX: ${pair.address} <==========`);
    const toSell = new BN(pair.tokensBought)
      .mul(new BN(pair.Token.percentToSell.toString()))
      .div(new BN("100"));
    console.log("pair.tokensBought", pair.tokensBought.toString());

    console.log("toSell", toSell.toString());
    const paymentToken = this._createERC20TokenContract(pair.tokenA, chainId);
    const getBalance = paymentToken.methods.balanceOf(
      pair.Token.Wallet.address
    );
    const balanceBefore = await getBalance.call();

    let swapTx;
    try {
      swapTx = await this._swap(
        pair.Token,
        [pair.tokenB, pair.tokenA],
        false
      );

      await this._logTokenSold({
        pairAddress: pair.address,
        tokenA: pair.tokenA,
        tokenB: pair.tokenB,
        swapTx: swapTx.transactionHash,
      });

    } catch (e) {
      console.log("Error:", e);

      await this._logTokenSellFailed({
        pairAddress: pair.address,
        tokenA: pair.tokenA,
        tokenB: pair.tokenB,
        error: e.message,
      });

    }
    

    const balanceAfter = await getBalance.call();
    // to get profit, we will compare balance before with balance after
    // alternate: call events. a bit uglier.
    const difference = new BN(balanceAfter.toString()).sub(
      new BN(balanceBefore.toString())
    );
    let profit =
      tokenCurrencyMap[chainId][pair.tokenA] === "USDC"
        ? parseInt(difference) / 1000000
        : Web3.utils.fromWei(difference);

    profit = profit.toString();

    this.sellingPairId[pair.id] = false;
    return models.Pair.update(
      {
        amountSold: toSell.toString(),
        profit,
        tx: swapTx.transactionHash,
        status: "Closed",
      },
      {
        where: {
          id: pair.id,
        },
      }
    );
  }

  async _swap(token, path, isBuy) {
    console.log("Inside _swap, isBuy:", isBuy);
    const { address, privateKey, chainId } = token.Wallet;
    let toSwap;
    if (isBuy) {
      toSwap = convertBuyAmount(token.address, token.buyAmount);
    } else {
      const contract = this._createERC20TokenContract(path[0], chainId);
      const getBalance = contract.methods.balanceOf(address);
      const balance = await getBalance.call();
      toSwap = new BN(balance)
        .mul(new BN(token.percentToSell.toString()))
        .div(new BN("100"));

      const getAllowance = contract.methods.allowance(
        address,
        this.routerContract[chainId].options.address
      );

      const allowance = await getAllowance.call();

      if (new BN(allowance).isZero()) {
        console.log("need approval");
        await this._approve(
          token,
          path[0],
          contract,
          miscConstants.MAX_UINT_256
        );

        const allowance = await getAllowance.call();
        console.log("allowance after approve", allowance.toString());
      }
    }

    const minOutAmountsCall = this.routerContract[
      chainId
    ].methods.getAmountsOut(toSwap.toString(), path);
    const minOutAmounts = await minOutAmountsCall.call();

    console.log("minOutAmounts", minOutAmounts)

    let finalOutAmount = new this.web3[chainId].utils.BN(
      minOutAmounts[minOutAmounts.length - 1]
    );

    const wallets = await models.Wallet.findActiveWallets();
    const matchedWallet = wallets.find((wallet) => wallet.address === address);

    const details = await models.Slippages.findSlippageByWallet(matchedWallet.id);
    const matchedDetails = details.find((details) => details.walletId === matchedWallet.id);

    let slippage;

    if(matchedDetails.slippage == 0 || matchedDetails.slippage == null || matchedDetails.slippage == undefined){
      slippage = this.slippage;
    } else {
      slippage = matchedDetails.slippage;
    }

    const minOutAmount = finalOutAmount.mul(new this.web3[chainId].utils.BN(slippage)).div(new this.web3[chainId].utils.BN(10000));
    finalOutAmount = finalOutAmount.sub(minOutAmount).toString();

    try {
      return await this._swap_(
        toSwap,
        path,
        address,
        privateKey,
        finalOutAmount,
        chainId
      );
    } catch(e) {
      console.log("Error:", e);
      
      console.log("swap failed, trying swap2");

      return await this._swap2_(
        toSwap,
        path,
        address,
        privateKey,
        finalOutAmount,
        chainId
      );
    }
  }

  async _swap_(toSwap, path, address, privateKey, minOutAmount, chainId) {
    const currentTime = Math.round(Date.now() / 1000);

    const transaction = this.routerContract[
      chainId
    ].methods.swapExactTokensForTokens(
      toSwap.toString(),
      minOutAmount,
      path,
      address,
      currentTime + 300
    );

    const base = await this.web3[chainId].eth.getGasPrice();
    const gas =new this.web3[chainId].utils.BN(base.toString()).mul(new this.web3[chainId].utils.BN(15)).div(new this.web3[chainId].utils.BN(10));
    const baseGasLimit = await transaction.estimateGas({ from: address });
    const gasLimit = parseInt(baseGasLimit.toString());
    const gasLimitBuffer = parseInt(gasLimit * 0.5);

    const signed = await this.web3[chainId].eth.accounts.signTransaction(
      {
        to: book.networks[chainId].uniswap.router,
        data: transaction.encodeABI(),
        gas: (gasLimit + gasLimitBuffer).toString(), // await transaction.estimateGas({ from: address }),
        gasPrice: gas.toString(),
      },
      privateKey
    );

    console.log("SUCCESS _swap_");
    
    return await this.web3[chainId].eth.sendSignedTransaction(
      signed.rawTransaction
    );

  }

  async _swap2_(toSwap, path, address, privateKey, minOutAmount, chainId) {
    const currentTime = Math.round(Date.now() / 1000);

    const transaction = this.routerContract[
      chainId
    ].methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      toSwap.toString(),
      minOutAmount,
      path,
      address,
      currentTime + 300
    );

    const base = await this.web3[chainId].eth.getGasPrice();
    const gas = new BN(base.toString()).mul(new this.web3[chainId].utils.BN(15)).div(new this.web3[chainId].utils.BN(10));
    const baseGasLimit = await transaction.estimateGas({ from: address });
    const gasLimit = parseInt(baseGasLimit.toString());
    const gasLimitBuffer = parseInt(gasLimit * 0.5);

    const signed = await this.web3[chainId].eth.accounts.signTransaction(
      {
        to: book.networks[chainId].uniswap.router,
        data: transaction.encodeABI(),
        gas: (gasLimit + gasLimitBuffer).toString(), // await transaction.estimateGas({ from: address }),
        gasPrice: gas.toString(),
      },
      privateKey
    );

    console.log("SUCCESS _swap2_");

    return await this.web3[chainId].eth.sendSignedTransaction(
      signed.rawTransaction
    );

  }

  // TO DO: lets get balanceOf the token, then approved that amount (+ extra).
  async _approve(token, tokenAddress, tokenContract, amount) {
    const { address, privateKey, chainId } = token.Wallet;

    const transaction = tokenContract.methods.approve(
      book.networks[chainId].uniswap.router,
      amount.toString()
    );

    const base = await this.web3[chainId].eth.getGasPrice();
    const gas = new BN(base.toString()).add(new BN("4000000000"));
    const signed = await this.web3[chainId].eth.accounts.signTransaction(
      {
        to: tokenAddress,
        data: transaction.encodeABI(),
        gas: await transaction.estimateGas({ from: address }),
        gasPrice: gas.toString(),
      },
      privateKey
    );
    return await this.web3[chainId].eth.sendSignedTransaction(
      signed.rawTransaction
    );
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

  _createERC20TokenContract(tokenAddress, chainId) {
    return new this.web3[chainId].eth.Contract(erc20ABI, tokenAddress);
  }

  async _checkIfLPToken(addresses, chainIds) {
    let object = [];

    for (let i = 0; i < addresses.length; i++) {
      for (let j = 0; j < chainIds.length; j++) {
        const lpContract = new this.web3[chainIds[j]].eth.Contract(
          pairABI,
          addresses[i]
        );

        const getTokenA = lpContract.methods.token0();
        const getTokenB = lpContract.methods.token1();

        let tokenA, tokenB;

        try {
          tokenA = await getTokenA.call();
          tokenB = await getTokenB.call();
        } catch (e) {
          // console.error("Checking LP Token", e);
        }

        if (tokenA === undefined || tokenB === undefined) {
          // console.log('book', book.networks[chainIds[j]].tokens);
          let result;
          let resultWeth = await this._inferLPTokenFromToken(
            addresses[i],
            book.networks[chainIds[j]].tokens.weth,
            chainIds[j]
          );
          let resultUSDC = await this._inferLPTokenFromToken(
            addresses[i],
            book.networks[chainIds[j]].tokens.usdc,
            chainIds[j]
          );
          let resultUSDT = await this._inferLPTokenFromToken(
            addresses[i],
            book.networks[chainIds[j]].tokens.usdt,
            chainIds[j]
          );
          let resultDAI = await this._inferLPTokenFromToken(
            addresses[i],
            book.networks[chainIds[j]].tokens.dai,
            chainIds[j]
          );

          // Arranged in order of asset priority
          if (resultWeth !== undefined) {
            result = resultWeth;
          } else if (resultUSDC !== undefined) {
            result = resultUSDC;
          } else if (resultUSDT !== undefined) {
            result = resultUSDT;
          } else if (resultDAI !== undefined) {
            result = resultDAI;
          }

          if (result === undefined) {
            continue;
          }

          addresses[i] = result;
        }

        object.push({
          addressRetrieved: addresses[i],
          chain: chainIds[j],
        });
      }
    }

    object = object.filter(
      (thing, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.addressRetrieved === thing.addressRetrieved &&
            t.chain === thing.chain
        )
    );

    return object;
  }

  async _inferLPTokenFromToken(tokenAddress, supportedToken, chainId) {
    if (tokenAddress === "" || supportedToken === "") return;

    const factoryContract = await this.factoryContract[chainId].methods.getPair(
      supportedToken,
      tokenAddress
    );

    let pairAddress = await factoryContract.call();

    return pairAddress;
  }
}

module.exports = new LockerBot();
