/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */
import type {TestResult} from './testResult';

export type TestExecution = {|
  id: number,
  start_date_utc: Date,
  end_date_utc: Date,
  // unix epoch seconds
  expected_end_time: number,
  status: number,
  test_code: string,
  user_id: number,
  user_id: number,
  topology_id: number,
  topology_name: string,
  protocol: string,
  multi_hop_parallel_sessions: number,
  multi_hop_session_iteration_count: number,
  session_duration: number,
  test_push_rate: number,
  traffic_direction: number,
  // associations
  test_results: ?Array<TestResult>,
|};

export default function(sequelize: any, DataTypes: any) {
  const TestExecution = sequelize.define(
    'api_testrunexecution',
    {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      start_date_utc: {
        type: DataTypes.DATE,
      },
      end_date_utc: {
        type: DataTypes.DATE,
      },
      // unix epoch seconds
      expected_end_time: {
        type: DataTypes.INTEGER,
      },
      status: {
        type: DataTypes.INTEGER,
      },
      test_code: {
        allowNull: false,
        type: DataTypes.STRING(120),
      },
      multi_hop_parallel_sessions: {
        type: DataTypes.INTEGER,
      },
      multi_hop_session_iteration_count: {
        type: DataTypes.INTEGER,
      },
      session_duration: {
        type: DataTypes.INTEGER,
      },
      test_push_rate: {
        type: DataTypes.INTEGER,
      },
      traffic_direction: {
        type: DataTypes.INTEGER,
      },
      user_id: {
        type: DataTypes.INTEGER,
      },
      topology_id: {
        type: DataTypes.INTEGER,
      },
      topology_name: {
        type: DataTypes.STRING(256),
      },
      protocol: {
        type: DataTypes.ENUM(['TCP', 'UDP']),
      },
    },
    {
      /**
       * this table is managed by network test, so nms should not create or
       * migrate it.
       */
      doNotCreateTable: true,
      freezeTableName: true,
      timestamps: false,
    },
  );
  TestExecution.associate = function(models) {
    models.api_testrunexecution.hasMany(models.api_testresult, {
      as: 'test_results',
      foreignKey: 'test_run_execution_id',
    });
    models.api_testrunexecution.hasMany(models.api_testschedule, {
      as: 'test_schedules',
      foreignKey: 'test_run_execution_id',
    });
  };
  return TestExecution;
}
