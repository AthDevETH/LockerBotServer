const { Model, DataTypes, Op } = require("sequelize");
const { v4: uuid } = require("uuid");

module.exports = (sequelize, Wallet) => {
  class Slippages extends Model {

    static async findSlippageByWallet(walletId) {
      return (
        await this.findAll({
          where: {
            walletId,
          },
          include: [Wallet],
        })
      ).map((entity) => entity.get({ plain: true }));
    }

    static async findSlippage(walletId) {
      return await this.findOne({
        where: {
          walletId,
        },
        include: [Wallet],
      });
    }

    static async createAndReturn(data) {
      const plain = (await this.create(data)).get({ plain: true });
      
      const newSlippage = await this.findByPk(plain.id, {
        include: [
          {
            model: Wallet,
            as: "Wallet",
          },
        ],
      });

      return newSlippage.get({ plain: true });
    }
  }

  Slippages.init(
    {
      walletId: DataTypes.STRING,
      /* Wallet Slippage Settings */
      slippage: DataTypes.INTEGER,
      createdAt: DataTypes.TIME,
      updatedAt: DataTypes.TIME,
    },
    {
      sequelize,
      modelName: "Slippages",
      timestamps: true,
    }
  );

  Slippages.beforeCreate((channels) => (channels.id = uuid()));

  Wallet.hasMany(Slippages, {
    foreignKey: "walletId",
  });

  Slippages.belongsTo(Wallet);

  return Slippages;
};
