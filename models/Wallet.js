const { Model, DataTypes, Op } = require('sequelize');
const { v4: uuid } = require('uuid');

module.exports = (sequelize) => {
  class Wallet extends Model {
    static async findActiveWallets() {
      return (
        await this.findAll({
          where: { [Op.or]: [{ startUnicrypt: true }, { startTeamFin: true }] },
        })
      ).map((entity) => entity.get({ plain: true }));
    }
  }

  Wallet.init(
    {
      accountId: DataTypes.STRING,
      privateKey: DataTypes.STRING,
      address: DataTypes.STRING,
      startUnicrypt: DataTypes.BOOLEAN,
      startTeamFin: DataTypes.BOOLEAN,
      rpc: DataTypes.STRING,
      createdAt: DataTypes.TIME,
      updatedAt: DataTypes.TIME,
    },
    {
      sequelize,
      modelName: 'Wallet',
      timestamps: true,
    },
  );

  Wallet.beforeCreate((wallet) => (wallet.id = uuid()));

  return Wallet;
};
