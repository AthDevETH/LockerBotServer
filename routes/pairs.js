const router = require('express').Router();
const { param } = require('express-validator');
const validation = require('../middleware/validation');
const { walletValidation } = require('../middleware/walletValidation');
const { models } = require('../services/storage');
const events = require(`../services/events`);

router.get('/', async (req, res) => {
  const { offset = 0, limit = 25 } = req.query;

  const result = await models.Pair.findAll({
    order: [['updatedAt', 'ASC']],
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
  });

  return res.json(result);
});

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
    const { tokenId, offset = 0, limit = 25 } = req.query;

    let result;

    if (tokenId) {
      result = await models.Pair.findAll({
        where: {
          '$Token.id$': tokenId,
        },
        include: [
          {
            model: models.Token,
            as: 'Token',
          },
        ],
        order: [['updatedAt', 'DESC']],
        offset,
        limit,
      });
    } else {
      result = await models.Pair.findAll({
        where: {
          '$Token->Wallet.id$': walletId,
        },
        include: [
          {
            model: models.Token,
            as: 'Token',
            include: [
              {
                model: models.Wallet,
                as: 'Wallet',
              },
            ],
          },
        ],
        order: [['updatedAt', 'DESC']],
        limit: 100,
        offset,
      });
    }

    return res.json(result);
  },
);

// sells all of a token
router.post(
  '/sell/:accountId/:walletId',
  param('accountId').isEthereumAddress(),
  param('walletId').isUUID(),
  validation,
  walletValidation((req) => ({
    accountId: req.params.accountId,
    walletId: req.params.walletId,
  })),
  async (req, res) => {
    const { walletId } = req.params;
    const { pairId } = req.body;

    const foundPair = await models.Pair.findOne({
      where: {
        id: pairId,
        '$Token->Wallet.id$': walletId,
      },
      include: [
        {
          model: models.Token,
          as: 'Token',
          include: [
            {
              model: models.Wallet,
              as: 'Wallet',
            },
          ],
        },
      ],
    });

    if (!foundPair) {
      return res.status(404).json({
        status: 404,
        message: 'Pair not found',
      });
    }

    const response = await events.publishSync(
      events.TRIGGER_SALE_EVENT,
      foundPair,
    );

    if (response.status === 'Closed') {
      return res.json({
        profit: response.profit,
      });
    }

    return res.status(400).json({
      status: 400,
      message: 'Swap failed',
    });
  },
);

module.exports = router;
