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
import ScheduleActions from '../../components/scheduler/ScheduleActions';
import ScheduleNetworkTestModal from './ScheduleNetworkTestModal';
import ScheduleTable from '../../components/scheduler/ScheduleTable';
import axios from 'axios';
import useLiveRef from '../../hooks/useLiveRef';
import useUnmount from '../../hooks/useUnmount';
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
  strikeThrough: {
    textDecoration: 'line-through',
  },
  disabledText: {color: '#616161'},
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
    setFilterOptions({
      ...query,
      protocol: query.protocol?.map(key => NETWORK_TEST_PROTOCOLS[key]),
      status: query.status?.map(status => status.toLowerCase()),
    });
  }, []);

  const updateRef = useLiveRef(shouldUpdate);
  const runningTestTimeoutRef = React.useRef<?TimeoutID>(null);
  const actionTimeoutRef = React.useRef<?TimeoutID>(null);
  const resultsRef = React.useRef(null);

  const handleActionClick = React.useCallback(() => {
    setTimeout(() => {
      setLoading(true);
      actionTimeoutRef.current = setTimeout(() => {
        setShouldUpdate(!updateRef.current);
      }, 1000);
    }, 500);
  }, [setShouldUpdate, updateRef]);

  useUnmount(() => {
    if (runningTestTimeoutRef.current != null) {
      clearTimeout(runningTestTimeoutRef.current);
    }
    if (actionTimeoutRef.current != null) {
      clearTimeout(actionTimeoutRef.current);
    }
  });

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
    testApi
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

  const setDisableSchedule = async input => {
    if (input.id == null) {
      return;
    }
    await testApi
      .editTestSchedule({
        inputData: {
          enabled: input.enabled,
          cronExpr: input.cronExpr,
          networkName,
          iperfOptions: input.iperfOptions,
        },
        scheduleId: input.id,
      })
      .then(_ => {
        handleActionClick();
        enqueueSnackbar(
          `Successfully ${input.enabled ? 'resumed' : 'paused'} test schedule!`,
          {
            variant: 'success',
          },
        );
      })
      .catch(err =>
        enqueueSnackbar(
          `Failed to ${input.enabled ? 'resume' : 'pause'} test schedule: ` +
            err,
          {
            variant: 'error',
          },
        ),
      );
  };

  React.useEffect(() => {
    if (!filterOptions) {
      return;
    }

    const cancelSource = axios.CancelToken.source();
    setLoading(true);

    const dataFilterOptions = Object.keys(filterOptions).reduce((res, key) => {
      if (filterOptions[key]?.length === 1) {
        res[key] = filterOptions[key][0];
      }
      return res;
    }, {});

    const inputData = {
      networkName,
      ...dataFilterOptions,
      startTime: filterOptions?.startTime,
    };
    Promise.all([
      testApi.getSchedules({
        inputData,
        cancelToken: cancelSource.token,
      }),
      !filterOptions?.status ||
      filterOptions?.status.find(
        stat =>
          EXECUTION_STATUS[stat.toUpperCase()] !== EXECUTION_STATUS.SCHEDULED &&
          EXECUTION_STATUS[stat.toUpperCase()] !== EXECUTION_STATUS.PAUSED,
      )
        ? testApi.getExecutions({
            inputData,
            cancelToken: cancelSource.token,
          })
        : [],
    ]).then(results => {
      resultsRef.current = results;

      const tempRows = {running: [], schedule: [], executions: []};
      results.forEach(result => {
        if (result.includes('undefined')) {
          return (resultsRef.current = null);
        }
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
              rowId: 'schedule' + newRow.id,
              filterStatus: newRow.enabled ? 'SCHEDULED' : 'PAUSED',
              type: NETWORK_TEST_TYPES[newRow.test_type.toLowerCase()],
              start: newRow.enabled ? (
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
                ', ' +
                initialTime
              ) : (
                <div className={classes.disabledText}>
                  <div className={classes.strikeThrough}>
                    {'Scheduled ' +
                      (initialFrequency === FREQUENCIES.monthly
                        ? ''
                        : initialFrequency === FREQUENCIES.biweekly
                        ? 'every other '
                        : 'every ') +
                      (initialDay
                        ? initialDay.length > 2
                          ? initialDay
                          : 'monthly on the ' +
                            getDateNth({date: Number(initialDay)})
                        : 'day ') +
                      ', ' +
                      initialTime}
                  </div>
                </div>
              ),
              status: newRow.enabled ? (
                <Grid container spacing={1}>
                  <Grid item>{STATUS_ICONS.SCHEDULED}</Grid>
                  <Grid item>
                    <div className={classes.statusText}>{initialFrequency}</div>
                  </Grid>
                </Grid>
              ) : (
                <Grid container spacing={1}>
                  <Grid item>{STATUS_ICONS.PAUSED}</Grid>
                  <Grid item>
                    <div className={classes.statusText}>Schedule is paused</div>
                  </Grid>
                </Grid>
              ),
              protocol,
              actions: (
                <ScheduleActions
                  editButton={
                    <EditNetworkTestScheduleModal
                      id={newRow.id}
                      onActionClick={handleActionClick}
                      initialOptions={newRow.iperf_options || {}}
                      type={TEST_TYPE_CODES[newRow.test_type] || ''}
                      initialCronString={newRow.cron_expr || ''}
                    />
                  }
                  onDeleteSchedule={deleteSchedule}
                  onSetDisableSchedule={id =>
                    setDisableSchedule({
                      iperfOptions: newRow.iperf_options || {},
                      cronExpr: newRow.cron_expr || '',
                      enabled: !newRow.enabled,
                      id,
                    })
                  }
                  row={newRow}
                />
              ),
            });
          } else if (
            EXECUTION_STATUS[newRow.status] === EXECUTION_STATUS.RUNNING
          ) {
            tempRows.running.push({
              id: newRow.id,
              rowId: 'execution' + newRow.id,
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
            const filterStatus = newRow.status;
            tempRows.executions.push({
              id: newRow.id,
              rowId: 'execution' + newRow.id,
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
                newRow.status &&
                EXECUTION_STATUS[newRow.status] !== EXECUTION_STATUS.FAILED ? (
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

      if (tempRows.running.length > 0 && !runningTestTimeoutRef.current) {
        runningTestTimeoutRef.current = setTimeout(() => {
          setShouldUpdate(!updateRef.current);
          runningTestTimeoutRef.current = null;
        }, 10000);
      }
      if (resultsRef.current) {
        setLoading(false);
      }
    });

    return () => cancelSource.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions, shouldUpdate, networkName]);

  const optionsInput = [
    {
      name: 'testType',
      title: 'Type',
      initialValue: Object.keys(NETWORK_TEST_TYPES).map(type => type),
      options: Object.keys(NETWORK_TEST_TYPES).map(type => ({
        type,
        title: NETWORK_TEST_TYPES[type],
      })),
    },
    {
      name: 'protocol',
      title: 'Protocol',
      initialValue: Object.keys(PROTOCOL).map(key => PROTOCOL[key]),
      options: Object.keys(PROTOCOL).map(key => ({
        type: PROTOCOL[key],
        title: PROTOCOL[key],
      })),
    },
    {
      name: 'status',
      title: 'Status',
      initialValue: Object.keys(EXECUTION_STATUS).map(status => status),
      options: Object.keys(EXECUTION_STATUS).map(status => ({
        type: status,
        title: EXECUTION_STATUS[status],
      })),
    },
  ];

  const filteredRows = React.useMemo(
    () =>
      rows?.filter(row => {
        const correctProtocol =
          !filterOptions?.protocol ||
          filterOptions?.protocol.find(
            protocol => protocol === NETWORK_TEST_PROTOCOLS[row.protocol],
          );
        const correctDate =
          row.filterStatus === 'SCHEDULED' ||
          row.filterStatus === 'PAUSED' ||
          !filterOptions?.startTime ||
          (typeof row.start === 'string' &&
            new Date(row.start).getTime() >
              new Date(filterOptions?.startTime || '').getTime());
        const correctType =
          !filterOptions?.testType ||
          filterOptions?.testType.find(
            type => NETWORK_TEST_TYPES[type] === row.type,
          );
        const correctStatus =
          !filterOptions?.status ||
          filterOptions?.status.find(
            status => status === row.filterStatus.toLowerCase(),
          );
        return correctProtocol && correctDate && correctType && correctStatus;
      }),
    [rows, filterOptions],
  );

  return (
    <ScheduleTable
      schedulerModal={
        <ScheduleNetworkTestModal onActionClick={handleActionClick} />
      }
      createURL={createTestUrl}
      selectedExecutionId={selectedExecutionId}
      history={history}
      rows={filteredRows}
      loading={loading}
      filterOptions={filterOptions || {}}
      tableOptions={{
        optionsInput,
        onOptionsUpdate: handleFilterOptions,
      }}
    />
  );
}
