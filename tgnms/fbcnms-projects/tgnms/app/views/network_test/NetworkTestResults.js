/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import HealthGroupDropDown from './HealthGroupDropDown';
import HealthHistogram from './HealthHistogram';
import NetworkContext from '../../contexts/NetworkContext';
import Typography from '@material-ui/core/Typography';
import {EXECUTION_STATUS} from '../../constants/ScheduleConstants';
import {HEALTH_DEFS, HEALTH_EXECUTIONS} from '../../constants/HealthConstants';
import {TopologyElementType} from '../../constants/NetworkConstants';
import {
  getExecutionHealth,
  getExecutionStatus,
} from '../../helpers/NetworkTestHelpers';
import {makeStyles} from '@material-ui/styles';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';

import type {CreateTestUrl, LinkTestResultType} from './NetworkTestTypes';

type Props = {|
  createTestUrl: CreateTestUrl,
  executionResults: Array<LinkTestResultType>,
|};

const useStyles = makeStyles(theme => ({
  header: {
    marginBottom: theme.spacing(2),
  },
  histogram: {
    width: '100%',
    height: 300,
    paddingTop: theme.spacing(1),
  },
}));

export default function NetworkTestResults(props: Props) {
  const classes = useStyles();
  const {executionResults} = props;
  const {setSelected} = React.useContext(NetworkContext);

  const handleRowSelect = row => {
    setSelected(TopologyElementType.LINK, row.link_name);
  };
  const {healthExecutions, statusCount} = React.useMemo(() => {
    const healthExecutions = HEALTH_EXECUTIONS.map(health => ({
      health,
      executions: [],
    }));

    const statusCount = objectValuesTypesafe<string>(EXECUTION_STATUS).reduce(
      (res, status) => {
        res[status] = 0;
        return res;
      },
      {},
    );

    executionResults.forEach(execution => {
      const status = getExecutionStatus(execution);
      statusCount[status] += 1;
      if (status === EXECUTION_STATUS.FINISHED) {
        const health = getExecutionHealth(execution);
        healthExecutions
          .find(healthExecution => healthExecution.health === health)
          ?.executions.push(execution);
      }
    });
    return {healthExecutions, statusCount};
  }, [executionResults]);

  return (
    executionResults && (
      <>
        <HealthHistogram
          className={classes.histogram}
          healthExecutions={healthExecutions}
        />
        {statusCount[EXECUTION_STATUS.RUNNING] !== 0 ? (
          <Typography variant="body1">
            {statusCount[EXECUTION_STATUS.RUNNING]} links currently being tested
          </Typography>
        ) : null}
        <Typography variant="body1">
          {statusCount[EXECUTION_STATUS.FINISHED]} links successfully tested
        </Typography>

        <Typography variant="body1" className={classes.header}>
          {statusCount[EXECUTION_STATUS.FAILED] +
            statusCount[EXECUTION_STATUS.ABORTED]}{' '}
          links unsuccessfully tested
        </Typography>

        {healthExecutions.map(linkHealth =>
          linkHealth.executions.length ? (
            <HealthGroupDropDown
              key={HEALTH_DEFS[linkHealth.health].name}
              executions={linkHealth.executions}
              onRowSelect={handleRowSelect}
              dropDownText={
                linkHealth.executions.length +
                ' ' +
                HEALTH_DEFS[linkHealth.health].name +
                ' health links'
              }
              health={linkHealth.health}
            />
          ) : null,
        )}
      </>
    )
  );
}
