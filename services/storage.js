const { Sequelize } = require('sequelize');
const initWalletModel = require('../models/Wallet');
const initTokenModel = require('../models/Token');
const initPairModel = require('../models/Pair');
const initChannelsModel = require('../models/Channels');
const initSlippagesModel = require('../models/Slippages');

let sequelize;

if (process.env.JAWSDB_URL) {
  sequelize = new Sequelize(process.env.JAWSDB_URL);
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PW,
    {
      host: process.env.DB_HOST,
      dialect: 'mysql',
      port: 3306,
      logging: false,
    }
  )
}
// const sequelize = new Sequelize(
//   process.env.NODE_ENV === 'production'
//     ? config.production
//     : config.development,
// );

const Wallet = initWalletModel(sequelize);
const Token = initTokenModel(sequelize, Wallet);
const Channels = initChannelsModel(sequelize, Wallet);
const Slippages = initSlippagesModel(sequelize, Wallet);
initPairModel(sequelize, Token, Wallet, Channels, Slippages);

module.exports = sequelize;