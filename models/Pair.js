const { Model, DataTypes, Op } = require('sequelize');
const differenceWith = require('lodash/differenceWith');
const { v4: uuid } = require('uuid');
const { injectInclude } = require('../utils/sql');

const statusOrCondition = [{ status: 'Purchased' }, { status: 'Approved' }];

module.exports = (sequelize, Token, Wallet) => {
  const includeTokenWallet = injectInclude([
    'Token',
    Token,
    ['Wallet', Wallet],
  ]);

  class Pair extends Model {
    static async filterPairsToCreate(address, tokens) {
      const foundPairs = (
        await this.findAll({
          where: {
            address,
            tokenId: { [Op.in]: tokens.map((token) => token.id) },
          },
        })
      ).map((entity) => entity.get({ plain: true }));

      return differenceWith(tokens, foundPairs, (a, b) => a.id === b.tokenId);
    }

    static async findPurchasedPairsByType(tokenA) {
      return (
        await this.findAll({
          where: {
            tokenA,
            [Op.or]: statusOrCondition,
          },
          ...includeTokenWallet,
        })
      ).map((entity) => entity.get({ plain: true }));
    }

    static async findAllPurchasedPairs() {
      return (
        await this.findAll({
          where: {
            [Op.or]: statusOrCondition,
          },
          ...includeTokenWallet,
        })
      ).map((entity) => entity.get({ plain: true }));
    }

    static async findAllPurchasedPairsByTokenId(tokenId) {
      return (
        await this.findAll({
          where: {
            tokenId,
            [Op.or]: statusOrCondition,
          },
          ...includeTokenWallet,
        })
      ).map((entity) => entity.get({ plain: true }));
    }

    static async findSinglePairById(Id) {
      
        const item = await this.findOne({
          where: {
            id: Id,
          },
          ...includeTokenWallet,
        })
        return item.get({ plain: true})
    }

    static async createAndReturn(data) {
      const plain = (await this.create(data)).get({ plain: true });
      const newPair = await this.findByPk(plain.id, {
        ...includeTokenWallet,
      });

      return newPair.get({ plain: true });
    }
  }

  Pair.init(
    {
      tokenId: DataTypes.STRING,
      address: DataTypes.STRING,
      tokenA: DataTypes.STRING,
      tokenB: DataTypes.STRING,
      initialPrice: DataTypes.STRING,
      tokensBought: DataTypes.STRING,
      amountSold: DataTypes.STRING,
      profit: DataTypes.STRING,
      tx: DataTypes.STRING,
      status: DataTypes.STRING,
      createdAt: DataTypes.TIME,
      updatedAt: DataTypes.TIME,
    },
    {
      sequelize,
      modelName: 'Pair',
      timestamps: true,
    },
  );

  Pair.beforeCreate((pair) => (pair.id = uuid()));

  Token.hasMany(Pair, {
    foreignKey: 'tokenId',
  });
  Pair.belongsTo(Token);

  return Pair;
};
