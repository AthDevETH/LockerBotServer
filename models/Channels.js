const { Model, DataTypes, Op } = require("sequelize");
const { v4: uuid } = require("uuid");

module.exports = (sequelize, Wallet) => {
  class Channels extends Model {
    static async findActiveChannelsByName(name) {
      return (
        await this.findAll({
          where: {
            name,
            status: "Active",
          },
          include: [Wallet],
        })
      ).map((entity) => entity.get({ plain: true }));
    }

    static async findActiveChannels() {
      return (
        await this.findAll({
          where: {
            status: "Active",
          },
          include: [Wallet],
        })
      ).map((entity) => entity.get({ plain: true }));
    }

    static async findActiveChannelsByWallet(id) {
      return (
        await this.findAll({
          where: {
            id,
            status: "Active",
          },
          include: [Wallet],
        })
      ).map((entity) => entity.get({ plain: true }));
    }

    static async findChannels(walletId, name) {
      return await this.findOne({
        where: {
          name,
          walletId,
        },
        include: [Wallet],
      });
    }

    static async createAndReturn(data) {
      const plain = (await this.create(data)).get({ plain: true });
      const newChannel = await this.findByPk(plain.id, {
        include: [
          {
            model: Wallet,
            as: "Wallet",
          },
        ],
      });

      return newChannel.get({ plain: true });
    }
  }

  Channels.init(
    {
      walletId: DataTypes.STRING,
      name: DataTypes.STRING,
      /* Channels Settings */
      status: DataTypes.STRING,
      startTelegram: DataTypes.BOOLEAN,
      createdAt: DataTypes.TIME,
      updatedAt: DataTypes.TIME,
    },
    {
      sequelize,
      modelName: "Channels",
      timestamps: true,
    }
  );

  Channels.beforeCreate((channels) => (channels.id = uuid()));

  Wallet.hasMany(Channels, {
    foreignKey: "walletId",
  });
  Channels.belongsTo(Wallet);

  return Channels;
};
