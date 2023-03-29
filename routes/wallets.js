const router = require("express").Router();
const config = require("../config");
const { param } = require("express-validator");
const pick = require("lodash/pick");
const { models } = require("../services/storage");
const events = require("../services/events");
const validation = require("../middleware/validation");
const { validateWalletBody } = require("../middleware/validateBody");
const { privKeyValidation } = require("../middleware/privKeyValidation");
const Web3 = require("web3");

const supportedChainIds = config.supportedChainIds;

/* List all account wallets */
router.get(
  "/:accountId",
  param("accountId").isEthereumAddress(),
  validation,
  async (req, res) => {
    const { accountId } = req.params;
    const wallets = await models.Wallet.findAll({
      where: { accountId },
      order: [["updatedAt", "DESC"]],
    });

    return res.json(wallets);
  }
);

/* Create new wallet */

router.post(
  "/:accountId",
  param("accountId").isEthereumAddress(),
  ...validateWalletBody(),
  validation,
  async (req, res) => {
    const { accountId } = req.params;
    let chainId = null;
    try {
      if(!req.body.rpc) {
        throw "Please submit a RPC URL";
      }
      const provider = new Web3.providers.WebsocketProvider(req.body.rpc);
      const web3 = new Web3(provider);

      const foundWallet = await models.Wallet.findAll({
        where: {
          accountId,
        },
      });

      chainId = await web3.eth.getChainId();
      if (!chainId) {
        throw "The RPC URL is invalid";
      }

      if (foundWallet.length) {
        throw "Wallet already exists";
        const existingChaindId = foundWallet.filter(
          (wallet) => wallet.dataValues.chainId === chainId
        );

        if (existingChaindId.length) {
          throw "ChainId already exists";
        }
      }

      if (!supportedChainIds.includes(chainId)) {
        throw "Unsupported ChainId";
      }
    } catch (err) {
      return res.status(404).json({
        status: 404,
        message: err.toString(),
      });
    }

    if (chainId === null) {
      return res.status(404).json({
        status: 404,
        message: "Invalid RPC URL, could not fetch chainId",
      });
    }

    const wallet = await models.Wallet.create({
      accountId,
      chainId,
      ...req.body,
    });

    if (req.body.startUnicrypt || req.body.startTeamFin) {
      events.publish(events.WALLET_CHANGED_EVENT);
    }

    return res.json(wallet);
  }
);

/* Update wallet */

router.put(
  "/:accountId/:id",
  param("id").isUUID(),
  param("accountId").isEthereumAddress(),
  ...validateWalletBody(),
  validation,
  privKeyValidation,
  async (req, res) => {
    const { accountId, id } = req.params;

    const foundWallet = await models.Wallet.findOne({
      where: {
        id,
        accountId,
      },
    });

    if (!foundWallet) {
      return res.status(404).json({
        status: 404,
        message: "Wallet for this account not found",
      });
    }

    const updateBody = pick(req.body, [
      "privateKey",
      "address",
      "startUnicrypt",
      "startTeamFin",
      "rpc",
    ]);

    updateBody.chainId = foundWallet.chainId;

    if (req.body.rpc !== foundWallet.rpc) {
      const provider = new Web3.providers.WebsocketProvider(req.body.rpc);
      const web3 = new Web3(provider);

      updateBody.chainId = await web3.eth.getChainId();
      if (!updateBody.chainId) {
        return res.status(404).json({
          status: 404,
          message: "No chainId",
        });
      }

      if (!supportedChainIds.includes(updateBody.chainId)) {
        return res.status(404).json({
          status: 404,
          message: "Unsupported ChainId",
        });
      }
    }

    await models.Wallet.update(updateBody, {
      where: {
        id,
        accountId,
      },
    });

    const updatedWallet = await models.Wallet.findOne({
      where: {
        id,
        accountId,
      },
    });

    if (
      updatedWallet.startUnicrypt !== foundWallet.startUnicrypt ||
      updatedWallet.startTeamFin !== foundWallet.startTeamFin
    ) {
      events.publish(events.WALLET_CHANGED_EVENT);
    }

    return res.json(updatedWallet);
  }
);

module.exports = router;
