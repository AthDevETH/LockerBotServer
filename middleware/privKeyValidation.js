const { models } = require('../services/storage');
const web3Pool = require('../services/web3Pool');

const web3 = web3Pool.getNode();

module.exports.privKeyValidation = async (req, res, next) => {
  const { privateKey, address } = req.body;

  if (privateKey) {
    const { address: derivedAddress } =
      web3.eth.accounts.privateKeyToAccount(privateKey);

    if (derivedAddress !== address) {
      return res.status(400).json({
        status: 400,
        message:
          'Provided address is not a derivative of the provided private key.',
      });
    }
  }

  next();
};
