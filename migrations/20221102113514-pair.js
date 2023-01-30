'use strict';

const { DataTypes } = require('sequelize');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Pairs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      tokenId: {
        type: Sequelize.UUID,
        references: {
          model: 'Tokens',
          key: 'id',
        },
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      address: {
        type: Sequelize.STRING,
      },
      tokenA: {
        type: Sequelize.STRING,
      },
      tokenB: {
        type: Sequelize.STRING,
      },
      initialPrice: {
        type: DataTypes.STRING,
      },
      tokensBought: {
        type: DataTypes.STRING,
      },
      purchaseAmt: {
        type: DataTypes.STRING,
      },
      amountSold: {
        type: DataTypes.STRING,
        defaultValue: "0",
      },
      profit: {
        type: DataTypes.STRING,
        defaultValue: "0",
      },
      tx: {
        type: DataTypes.STRING,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: 'Purchased',
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
    await queryInterface.dropTable('Pairs');
  },
};
