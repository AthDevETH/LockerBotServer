const { Model, DataTypes, Op } = require('sequelize');
const { v4: uuid } = require('uuid');

module.exports = (sequelize, Wallet) => {
  class Token extends Model {
    static async findActiveTokensByAddress(address) {
      return (
        await this.findAll({
          where: {
            address,
            status: 'Active',
          },
          include: [Wallet],
        })
      ).map((entity) => entity.get({ plain: true }));
    }

    static async findToken(walletId, address) {
      return await this.findOne({
        where: {
          address,
          walletId,
        },
        include: [Wallet],
      });
    }

    static async createAndReturn(data) {
      const plain = (await this.create(data)).get({ plain: true });
      const newPair = await this.findByPk(plain.id, {
        include: [
          {
            model: Wallet,
            as: 'Wallet',
          },
        ],
      });

      return newPair.get({ plain: true });
    }
  }

  Token.init(
    {
      walletId: DataTypes.STRING,
      address: DataTypes.STRING,
      /* Pair Settings */
      buyAmount: DataTypes.FLOAT,
      percentToSell: DataTypes.INTEGER,
      multiplierTarget: DataTypes.FLOAT,
      monitorLength: DataTypes.INTEGER,
      cyclesToTimeout: DataTypes.INTEGER,
      /* Pair Settings */
      status: DataTypes.STRING,
      createdAt: DataTypes.TIME,
      updatedAt: DataTypes.TIME,
    },
    {
      sequelize,
      modelName: 'Token',
      timestamps: true,
    },
  );

  Token.beforeCreate((token) => (token.id = uuid()));

  Wallet.hasMany(Token, {
    foreignKey: 'walletId',
  });
  Token.belongsTo(Wallet);

  return Token;
};
