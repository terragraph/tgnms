/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as testApi from '../../apiutils/NetworkTestAPIUtil';
import Button from '@material-ui/core/Button';
import EditNetworkTestScheduleModal from './EditNetworkTestScheduleModal';
import Grid from '@material-ui/core/Grid';
import NetworkContext from '../../contexts/NetworkContext';
import ResultExport from '../../components/scheduler/ResultExport';
import ScheduleNetworkTestModal from './ScheduleNetworkTestModal';
import ScheduleTable from '../../components/scheduler/ScheduleTable';
import axios from 'axios';
import {
  BUTTON_TYPES,
  EXECUTION_STATUS,
  FREQUENCIES,
  NETWORK_TEST_PROTOCOLS,
  NETWORK_TEST_TYPES,
  PROTOCOL,
  STATUS_ICONS,
  TEST_TYPE_CODES,
} from '../../constants/ScheduleConstants';
import {
  getDateNth,
  getFormattedDateAndTime,
  getParsedCronString,
} from '../../helpers/ScheduleHelpers';
import {makeStyles} from '@material-ui/styles';
import {useEnqueueSnackbar} from '@fbcnms/ui/hooks/useSnackbar';
import {useHistory} from 'react-router';

import type {CreateTestUrl} from './NetworkTestTypes';
import type {FilterOptionsType} from '../../../shared/dto/NetworkTestTypes';

type Props = {
  createTestUrl: CreateTestUrl,
  selectedExecutionId?: ?string,
};

const useStyles = makeStyles(theme => ({
  statusText: {
    paddingTop: theme.spacing(0.5),
  },
  executionActionButtonContainer: {
    marginLeft: -theme.spacing(1),
  },
  scheduleActionButtonContainer: {
    marginLeft: -theme.spacing(2),
  },
}));

export default function NetworkTest(props: Props) {
  const classes = useStyles();
  const history = useHistory();

  const {createTestUrl, selectedExecutionId} = props;
  const [loading, setLoading] = React.useState(true);
  const [shouldUpdate, setShouldUpdate] = React.useState(false);
  const [filterOptions, setFilterOptions] = React.useState<?FilterOptionsType>(
    null,
  );
  const [rows, setRows] = React.useState([]);
  const {networkName} = React.useContext(NetworkContext);
  const enqueueSnackbar = useEnqueueSnackbar();

  const handleFilterOptions = React.useCallback(query => {
    setFilterOptions(query);
  }, []);

  const handleActionClick = React.useCallback(() => {
    setTimeout(() => {
      setShouldUpdate(!shouldUpdate);
    }, 1000);
  }, [setShouldUpdate, shouldUpdate]);

  const abortExecution = id => {
    if (id == null) {
      return;
    }
    return testApi
      .stopExecution({
        executionId: id,
      })
      .then(_ => {
        handleActionClick();
        enqueueSnackbar('Successfully stopped test!', {
          variant: 'success',
        });
      })
      .catch(err =>
        enqueueSnackbar('Failed to stop test: ' + err, {
          variant: 'error',
        }),
      );
  };

  const deleteSchedule = id => {
    if (id == null) {
      return;
    }
    return testApi
      .deleteSchedule({
        scheduleId: id,
      })
      .then(_ => {
        handleActionClick();
        enqueueSnackbar('Successfully deleted test schedule!', {
          variant: 'success',
        });
      })
      .catch(err =>
        enqueueSnackbar('Failed to delete test schedule: ' + err, {
          variant: 'error',
        }),
      );
  };

  React.useEffect(() => {
    const cancelSource = axios.CancelToken.source();

    setLoading(true);
    const inputData = {
      networkName,
      ...filterOptions,
      status: filterOptions?.status && EXECUTION_STATUS[filterOptions.status],
      protocol:
        filterOptions?.protocol &&
        NETWORK_TEST_PROTOCOLS[filterOptions.protocol],
    };
    Promise.all([
      testApi.getSchedules({
        inputData,
        cancelToken: cancelSource.token,
      }),
      testApi.getExecutions({
        inputData,
        cancelToken: cancelSource.token,
      }),
    ]).then(results => {
      const tempRows = {running: [], schedule: [], executions: []};
      results.forEach(result => {
        if (typeof result === 'string') {
          return enqueueSnackbar(result, {
            variant: 'error',
          });
        }
        result.forEach(newRow => {
          const protocol =
            newRow.iperf_options.protocol === NETWORK_TEST_PROTOCOLS.UDP
              ? PROTOCOL.UDP
              : PROTOCOL.TCP;
          if (newRow.status === undefined) {
            const {
              initialFrequency,
              initialTime,
              initialDay,
            } = getParsedCronString({cronString: newRow.cron_expr || ''});
            tempRows.schedule.push({
              id: newRow.id,
              filterStatus: 'SCHEDULED',
              type: NETWORK_TEST_TYPES[newRow.test_type.toLowerCase()],
              start:
                'Scheduled ' +
                (initialFrequency === FREQUENCIES.monthly
                  ? ''
                  : initialFrequency === FREQUENCIES.biweekly
                  ? 'every other '
                  : 'every ') +
                (initialDay
                  ? initialDay.length > 2
                    ? initialDay
                    : 'monthly on the ' + getDateNth({date: Number(initialDay)})
                  : 'day ') +
                ' at ' +
                initialTime,
              status: (
                <Grid container spacing={1}>
                  <Grid item>{STATUS_ICONS.SCHEDULED}</Grid>
                  <Grid item>
                    <div className={classes.statusText}>{initialFrequency}</div>
                  </Grid>
                </Grid>
              ),
              protocol,
              actions: (
                <div className={classes.scheduleActionButtonContainer}>
                  {
                    <EditNetworkTestScheduleModal
                      id={newRow.id}
                      onActionClick={handleActionClick}
                      initialOptions={newRow.iperf_options || {}}
                      type={TEST_TYPE_CODES[newRow.test_type] || ''}
                      initialCronString={newRow.cron_expr || ''}
                    />
                  }
                  {
                    <Button onClick={() => deleteSchedule(newRow.id)}>
                      {BUTTON_TYPES.delete}
                    </Button>
                  }
                </div>
              ),
            });
          } else if (newRow.status === 'RUNNING') {
            tempRows.running.push({
              id: newRow.id,
              type: NETWORK_TEST_TYPES[newRow.test_type.toLowerCase()],
              filterStatus: newRow.status,
              start: getFormattedDateAndTime({date: newRow.start_dt || ''}),
              status: (
                <Grid container spacing={1}>
                  <Grid item>{STATUS_ICONS.RUNNING}</Grid>
                  <Grid item>
                    <div className={classes.statusText}>In progress</div>
                  </Grid>
                </Grid>
              ),
              protocol,
              actions: (
                <div className={classes.executionActionButtonContainer}>
                  {
                    <Button onClick={() => abortExecution(newRow.id)}>
                      {BUTTON_TYPES.abort}
                    </Button>
                  }
                </div>
              ),
            });
          } else {
            const filterStatus =
              newRow.status === 'FINISHED' ? 'COMPLETED' : newRow.status;
            tempRows.executions.push({
              id: newRow.id,
              filterStatus,
              type: NETWORK_TEST_TYPES[newRow.test_type.toLowerCase()],
              start: getFormattedDateAndTime({date: newRow.start_dt || ''}),
              status: (
                <Grid container spacing={1}>
                  <Grid item>{STATUS_ICONS[filterStatus]}</Grid>
                  <Grid item>
                    <div className={classes.statusText}>
                      {getFormattedDateAndTime({date: newRow.end_dt || ''})}
                    </div>
                  </Grid>
                </Grid>
              ),
              protocol,
              actions:
                newRow.status === 'FINISHED' ? (
                  <div className={classes.executionActionButtonContainer}>
                    {<ResultExport id={String(newRow.id)} />}
                  </div>
                ) : null,
            });
          }
        });
      });
      setRows([
        ...tempRows.running,
        ...tempRows.schedule.reverse(),
        ...tempRows.executions.reverse(),
      ]);
      setLoading(false);
    });

    return () => cancelSource.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions, shouldUpdate, networkName]);

  return (
    <ScheduleTable
      schedulerModal={
        <ScheduleNetworkTestModal onActionClick={handleActionClick} />
      }
      createURL={createTestUrl}
      selectedExecutionId={selectedExecutionId}
      history={history}
      rows={rows}
      loading={loading}
      filterOptions={filterOptions || {}}
      handleFilterOptions={handleFilterOptions}
    />
  );
}
