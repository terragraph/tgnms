/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .addColumn('topology', 'wireless_controller', {
        allowNull: true,
        type: Sequelize.INTEGER,
      })
      .then(() => {
        return queryInterface.addConstraint(
          'topology',
          ['wireless_controller'],
          {
            type: 'foreign key',
            name: 'topology_wireless_controller',
            references: {
              table: 'wireless_controller',
              field: 'id',
            },
            onDelete: 'set null',
            onUpdate: 'cascade',
          },
        );
      });
  },

  down: (_queryInterface, _Sequelize) => {
    return;
  },
};
