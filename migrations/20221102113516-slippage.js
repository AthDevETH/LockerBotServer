"use strict";

const { DataTypes } = require("sequelize");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Slippages", {
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
      slippage: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable("Slippages");
  },
};
