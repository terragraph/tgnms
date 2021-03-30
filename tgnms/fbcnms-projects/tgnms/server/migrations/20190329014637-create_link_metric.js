/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface.createTable('link_metric', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      key_name: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      key_prefix: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true,
      },
      description: {
        allowNull: false,
        type: DataTypes.STRING,
      },
    });
  },

  down: (_queryInterface, _Sequelize) => {},
};
