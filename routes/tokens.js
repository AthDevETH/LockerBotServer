const router = require('express').Router();
const pick = require('lodash/pick');
const { param } = require('express-validator');
const validation = require('../middleware/validation');
const { validateTokenBody } = require('../middleware/validateBody');
const { walletValidation } = require('../middleware/walletValidation');
const { models } = require('../services/storage');
const events = require('../services/events');
const { types: errorTypes } = require('../utils/errors');

router.post(
  '/:accountId',
  param('accountId').isEthereumAddress(),
  ...validateTokenBody(),
  validation,
  walletValidation((req) => ({
    accountId: req.params.accountId,
    walletId: req.body.walletId,
  })),
  async (req, res) => {
    const { walletId, address } = req.body;

    const foundToken = await models.Token.findToken(walletId, address);

    if (foundToken) {
      return res.status(400).json({
        status: 400,
        message: 'Token already exists',
      });
    }

    let token;
4
    try {
      token = await models.Token.createAndReturn(req.body);
      await events.publishSync(events.TRIGGER_APPROVE_EVENT, token);

      return token;
    } catch (err) {
      if (err.name === errorTypes.TRANSACTION_ERROR) {
        if (token) {
          await token.destroy();
        }

        return res.status(400).json({
          status: 400,
          message: 'Token approval failed',
        });
      }

      throw err; // No need to handle 5xx. Will throw 500 in the uncaughtException middleware anyway.
    }
  },
);

router.put(
  '/:accountId/:id',
  param('id').isUUID(),
  param('accountId').isEthereumAddress(),
  ...validateTokenBody(),
  validation,
  async (req, res) => {
    const { accountId, id } = req.params; // TODO: Add walletId check

    const foundWallet = await models.Wallet.findOne({
      where: {
        accountId,
      },
    });

    if (!foundWallet) {
      return res.status(404).json({
        status: 404,
        message: 'Wallet for this account not found',
      });
    }

    const updateBody = pick(req.body, [
      'buyAmount',
      'percentToSell',
      'multiplierTarget',
      'monitorLength',
      'cyclesToTimeout',
    ]);

    await models.Token.update(updateBody, {
      where: {
        id,
      },
    });

    const updatedPair = await models.Token.findOne({
      where: {
        id,
      },
    });

    events.publish(events.TOKEN_CHANGED_EVENT, { tokenId: id });

    return res.json(updatedPair);
  },
);

/* Get wallet tokens. Throws if trying to create a second token of the same address */
router.get(
  '/:accountId/:walletId',
  param('accountId').isEthereumAddress(),
  param('walletId').isUUID(),
  validation,
  walletValidation((req) => ({
    accountId: req.params.accountId,
    walletId: req.params.walletId,
  })),
  async (req, res) => {
    const { walletId } = req.params;

    const pairs = await models.Token.findAll({
      where: { walletId },
      order: [['updatedAt', 'DESC']],
    });

    return res.json(pairs);
  },
);

router.get(
  '/history/:accountId/:walletId',
  param('accountId').isEthereumAddress(),
  param('walletId').isUUID(),
  validation,
  walletValidation((req) => ({
    accountId: req.params.accountId,
    walletId: req.params.walletId,
  })),
  async (req, res) => {
    const { walletId } = req.params;

    const pairs = await models.Token.findAll({
      where: {
        walletId,
        status: 'Closed',
      },
      order: [['updatedAt', 'DESC']],
    });

    return res.json(pairs);
  },
);

module.exports = router;
