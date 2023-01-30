const router = require('express').Router();
const { param } = require('express-validator');
const pick = require('lodash/pick');
const { models } = require('../services/storage');
const events = require('../services/events');
const validation = require('../middleware/validation');
const { validateWalletBody } = require('../middleware/validateBody');
const { privKeyValidation } = require('../middleware/privKeyValidation');

/* List all account wallets */
router.get(
  '/:accountId',
  param('accountId').isEthereumAddress(),
  validation,
  async (req, res) => {
    const { accountId } = req.params;
    const wallets = await models.Wallet.findAll({
      where: { accountId },
      order: [['updatedAt', 'DESC']],
    });

    return res.json(wallets);
  },
);

/* Create new wallet */

router.post(
  '/:accountId',
  param('accountId').isEthereumAddress(),
  ...validateWalletBody(),
  validation,
  async (req, res) => {
    const { accountId } = req.params;
    const wallet = await models.Wallet.create({
      accountId,
      ...req.body,
    });

    if (req.body.startUnicrypt || req.body.startTeamFin) {
      events.publish(events.WALLET_CHANGED_EVENT);
    }

    return res.json(wallet);
  },
);

/* Update wallet */

router.put(
  '/:accountId/:id',
  param('id').isUUID(),
  param('accountId').isEthereumAddress(),
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
        message: 'Wallet for this account not found',
      });
    }

    const updateBody = pick(req.body, [
      'privateKey',
      'address',
      'startUnicrypt',
      'startTeamFin',
      'rpc',
    ]);

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
  },
);

module.exports = router;
