const { models } = require('../services/storage');

module.exports.walletValidation = (getParams) => async (req, res, next) => {
  const { accountId, walletId } = getParams(req);

  const foundWallet = await models.Wallet.findOne({
    where: {
      id: walletId,
      accountId,
    },
  });

  if (!foundWallet) {
    return res.status(404).json({
      status: 404,
      message: 'Wallet for this account not found',
    });
  }

  next();
};
