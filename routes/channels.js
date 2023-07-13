const router = require("express").Router();
const config = require("../config");
const pick = require("lodash/pick");
const { param } = require("express-validator");
const validation = require("../middleware/validation");
const { validateChannelsBody } = require("../middleware/validateBody");
const { walletValidation } = require("../middleware/walletValidation");
const { models } = require("../services/storage");
const events = require("../services/events");
const { types: errorTypes } = require("../utils/errors");

router.post(
  "/:accountId",
  param("accountId").isEthereumAddress(),
  ...validateChannelsBody(),
  validation,
  walletValidation((req) => ({
    accountId: req.params.accountId,
    walletId: req.body.walletId,
  })),
  async (req, res) => {
    const { walletId, name } = req.body;

    const foundChannel = await models.Channels.findChannels(walletId, name);

    if (foundChannel) {
      return res.status(400).json({
        status: 400,
        message: "Channel already exists",
      });
    }

    let channel;

    try {
      channel = await models.Channels.createAndReturn(req.body);
      console.log("publishing event");
      await events.publishSync(events.TRIGGER_CHANNEL_EVENT, channel);
      console.log(" event published");

      return res.json(channel);
    } catch (err) {
      if (err.name === errorTypes.TRANSACTION_ERROR) {
        console.log("error", err);
        if (channel) {
          await channel.destroy();
        }

        console.log("Channel approval failed", err);

        return res.status(400).json({
          status: 400,
          message: "Channel approval failed",
        });
      }

      throw err; // No need to handle 5xx. Will throw 500 in the uncaughtException middleware anyway.
    }
  }
);

router.put(
  "/:name/:id",
  param("id").isUUID(),
  param("name").isString(),
  ...validateChannelsBody(),
  validation,
  async (req, res) => {
    const { name, id } = req.params; // TODO: Add walletId check

    const foundWallet = await models.Channels.findOne({
      where: {
        name,
      },
    });

    if (!foundWallet) {
      return res.status(404).json({
        status: 404,
        message: "Wallet for this account not found",
      });
    }

    const updateBody = pick(req.body, ["name", "status", "startTelegram"]);

    await models.Channels.update(updateBody, {
      where: {
        id,
      },
    });

    const updatedChannel = await models.Channels.findOne({
      where: {
        id,
      },
    });

    events.publish(events.TRIGGER_CHANNEL_EVENT, { tokenId: id });

    return res.json(updatedChannel);
  }
);

/* Get telegram channels */
router.get(
  "/:accountId/:walletId",
  param("accountId").isString(),
  param("walletId").isUUID(),
  validation,
  walletValidation((req) => ({
    accountId: req.params.accountId,
    walletId: req.params.walletId,
  })),
  async (req, res) => {
    const { walletId } = req.params;

    const pairs = await models.Channels.findAll({
      where: { walletId },
      order: [["updatedAt", "DESC"]],
    });

    return res.json(pairs);
  }
);

module.exports = router;
