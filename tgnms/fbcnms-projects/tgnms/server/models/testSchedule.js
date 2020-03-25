/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import type {TestExecution} from './testExecution';

import type Sequelize, {DataTypes as DataTypesType, Model} from 'sequelize';

type TestScheduleAttributes = {|
  id: number,
  cron_minute: string,
  cron_hour: string,
  cron_day_of_month: string,
  cron_month: string,
  cron_day_of_week: string,
  priority: number,
  asap: boolean,
  test_run_execution_id: number,
  test_execution: ?TestExecution,
|};

export type TestSchedule = TestScheduleAttributes &
  Model<TestScheduleAttributes>;

export default function (sequelize: Sequelize, DataTypes: DataTypesType) {
  const TestSchedule = sequelize.define(
    'api_testschedule',
    {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      cron_minute: {
        type: DataTypes.STRING(120),
      },
      cron_hour: {
        type: DataTypes.STRING(120),
      },
      cron_day_of_month: {
        type: DataTypes.STRING(120),
      },
      cron_month: {
        type: DataTypes.STRING(120),
      },
      cron_day_of_week: {
        type: DataTypes.STRING(120),
      },
      priority: {
        type: DataTypes.INTEGER,
      },
      asap: {
        type: DataTypes.INTEGER(1),
      },
      test_run_execution_id: {
        type: DataTypes.INTEGER,
      },
      created_at: {
        type: DataTypes.DATE,
      },
    },
    {
      timestamps: false,
      freezeTableName: true,
      /**
       * this table is managed by network test, so nms should not create or
       * migrate it.
       */
      doNotCreateTable: true,
    },
  );

  TestSchedule.associate = function (models) {
    models.api_testschedule.belongsTo(models.api_testrunexecution, {
      as: 'test_schedule',
      foreignKey: 'test_run_execution_id',
    });
  };

  return TestSchedule;
}
