const { body } = require("express-validator");

module.exports.validateWalletBody = () => [
  body("privateKey").isHash("sha256"),
  body("address").isEthereumAddress(),
  body("startUnicrypt").isBoolean().optional({ nullable: true }),
  body("startTeamFin").isBoolean().optional({ nullable: true }),
  body("rpc").isString(),
];

module.exports.validateTokenBody = () => [
  body("buyAmount").isNumeric().optional({ nullable: true }),
  body("percentToSell")
    .isInt({ min: 0, max: 100 })
    .optional({ nullable: true }),
  body("multiplierTarget").isNumeric().optional({ nullable: true }),
  body("monitorLength").isInt().optional({ nullable: true }),
  body("cyclesToTimeout").isInt().optional({ nullable: true }),
];

module.exports.validateChannelsBody = () => [
  body("name").isString(),
  body("startTelegram").isBoolean().optional({ nullable: true }),
];

module.exports.validateSlippageBody = () => [
  body("slippage").isInt(),
];