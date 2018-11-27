/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

export default function(sequelize, DataTypes) {
  const NetworkTestResults = sequelize.define(
    'api_testrunexecution',
    {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      start_date: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      end_date: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      status: {
        allowNull: false,
        type: DataTypes.INTEGER,
        //values: ['running', 'finished', 'aborted'],
      },
      test_code: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
      user_id: {
        allowNull: true,
        type: DataTypes.INTEGER,
      },
      topology_id: {
        allowNull: true,
        type: DataTypes.INTEGER,
      },
      /*
      outcome: {
        type: DataTypes.ENUM,
        values: ['pass', 'fail', 'inprogress', 'unk'],
      },
      raw_test_desc: {
        allowNull: false,
        type: DataTypes.STRING(2048),
        //unique: true,
      },
      software_ver_nms: {
        type: DataTypes.STRING(2048),
      },
      test_sub_type: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },*/
    },
    {
      freezeTableName: true,
      timestamps: false,
    },
  );

  return NetworkTestResults;
}
