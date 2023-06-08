"use strict";

const { DataTypes } = require("sequelize");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Channels", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      walletId: {
        type: Sequelize.UUID,
        references: {
          model: "Wallets",
          key: "id",
        },
        onUpdate: "cascade",
        onDelete: "cascade",
      },
      name: {
        type: Sequelize.STRING,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "Active",
      },
      startTelegram: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.TIME,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.TIME,
        defaultValue: DataTypes.NOW,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Channels");
  },
};
