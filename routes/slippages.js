const router = require("express").Router();
const pick = require("lodash/pick");
const { param } = require("express-validator");
const validation = require("../middleware/validation");
const { validateSlippageBody } = require("../middleware/validateBody");
const { walletValidation } = require("../middleware/walletValidation");
const { models } = require("../services/storage");
const events = require("../services/events");
const { types: errorTypes } = require("../utils/errors");

// create slippage
router.post(
  "/:accountId",
  param("accountId").isEthereumAddress(),
  ...validateSlippageBody(),
  validation,
  walletValidation((req) => ({
    accountId: req.params.accountId,
    walletId: req.body.walletId,
  })),
  async (req, res) => {
    const { walletId, name, slippage } = req.body;

    const foundSlippage = await models.Slippages.findSlippage(walletId, name);

    if (foundSlippage) {
      return res.status(400).json({
        status: 400,
        message: "Slippage already exists",
      });
    }

    if(slippage){
      if(slippage < 0 || slippage > 10000){
        return res.status(400).json({
          status: 400,
          message: "Slippage must be between 0% and 100%",
        });
      }
    } else {
      return res.status(400).json({
        status: 400,
        message: "Slippage not set",
      });
    }

    let newSlippage;

    try {
      newSlippage = await models.Slippages.createAndReturn(req.body);
      console.log("publishing event");
      await events.publishSync(events.TRIGGER_SLIPPAGE_EVENT, newSlippage);
      console.log(" event published");

      return res.json(newSlippage);
    } catch (err) {
      if (err.name === errorTypes.TRANSACTION_ERROR) {
        console.log("error", err);
        if (newSlippage) {
          await newSlippage.destroy();
        }

        console.log("newSlippage creation failed", err);

        return res.status(400).json({
          status: 400,
          message: "newSlippage creation failed",
        });
      }

      throw err; // No need to handle 5xx. Will throw 500 in the uncaughtException middleware anyway.
    }
  }
);

// update slippage
router.put(
  "/:id",
  param("id").isUUID(),
  ...validateSlippageBody(),
  validation,
  async (req, res) => {
    // req.params.accountId
    const { id } = req.params; // TODO: Add walletId check

    const foundWallet = await models.Slippages.findOne({
      where: {
        id,
      },
    });

    if (!foundWallet) {
      return res.status(404).json({
        status: 404,
        message: "Wallet for this account not found",
      });
    }

    const updateBody = pick(req.body, ["slippage"]);
    const { slippage } = req.body;

    if(slippage){
      if(slippage < 0 || slippage > 10000){
        return res.status(400).json({
          status: 400,
          message: "Slippage must be between 0% and 100%",
        });
      }
    }

    await models.Slippages.update(updateBody, {
      where: {
        id,
      },
    });

    const updatedSlippage = await models.Slippages.findOne({
      where: {
        id,
      },
    });

    events.publish(events.TRIGGER_SLIPPAGE_EVENT, { slippage: id });

    return res.json(updatedSlippage);
  }
);

/* Get wallet slippage */
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

    const slippage = await models.Slippages.findAll({
      where: { walletId },
      order: [["updatedAt", "DESC"]],
    });

    return res.json(slippage);
  }
);

module.exports = router;