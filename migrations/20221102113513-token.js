'use strict';

const { DataTypes } = require('sequelize');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Tokens', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      walletId: {
        type: Sequelize.UUID,
        references: {
          model: 'Wallets',
          key: 'id',
        },
        onUpdate: 'cascade',
        onDelete: 'cascade',
      },
      address: {
        type: Sequelize.STRING,
      },
      buyAmount: {
        type: Sequelize.FLOAT,
        defaultValue: 0.0,
      },
      percentToSell: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      multiplierTarget: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0,
      },
      monitorLength: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      cyclesToTimeout: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: 'Active',
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
    await queryInterface.dropTable('Tokens');
  },
};
