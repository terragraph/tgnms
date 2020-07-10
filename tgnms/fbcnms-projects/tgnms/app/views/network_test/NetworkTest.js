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
import useLiveRef from '../../hooks/useLiveRef';
import useUnmount from '../../hooks/useUnmount';
import {
  BUTTON_TYPES,
  EXECUTION_DEFS,
  EXECUTION_STATUS,
  FREQUENCIES,
  NETWORK_TEST_PROTOCOLS,
  NETWORK_TEST_TYPES,
  PROTOCOL,
  TEST_TYPE_CODES,
} from '../../constants/ScheduleConstants';
import {
  getDateNth,
  getFormattedDateAndTime,
  getParsedCronString,
} from '../../helpers/ScheduleHelpers';
import {isTestRunning} from '../../helpers/NetworkTestHelpers';
import {makeStyles} from '@material-ui/styles';
import {useEnqueueSnackbar} from '@fbcnms/ui/hooks/useSnackbar';
import {useHistory} from 'react-router';
import {useLoadTestTableData} from '../../hooks/NetworkTestHooks';

import type {CreateTestUrl} from './NetworkTestTypes';
import type {
  FilterOptionsType,
  InputGetType,
} from '../../../shared/dto/NetworkTestTypes';

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
  const [shouldUpdate, setShouldUpdate] = React.useState(false);
  const [filterOptions, setFilterOptions] = React.useState<?FilterOptionsType>(
    null,
  );
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

  const handleActionClick = React.useCallback(() => {
    setTimeout(() => {
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

  const dataFilterOptions: $Shape<InputGetType> =
    (filterOptions &&
      Object.keys(filterOptions).reduce((res, key) => {
        if (filterOptions[key]?.length === 1) {
          res[key] = filterOptions[key][0];
        }
        return res;
      }, {})) ||
    {};

  const inputData: InputGetType = {
    networkName,
    ...dataFilterOptions,
    startTime: filterOptions?.startTime,
  };

  if (
    inputData.testType &&
    NETWORK_TEST_TYPES[inputData.testType] === NETWORK_TEST_TYPES.partial
  ) {
    inputData.testType = 'multihop';
  }

  const {loading, data} = useLoadTestTableData({
    filterOptions: filterOptions || {},
    inputData,
    actionUpdate: shouldUpdate,
  });

  const rows = filterData(data, filterOptions).map(row => {
    {
      const throughputTestMode = row.whitelist?.length === 1;
      const protocol =
        row.iperf_options.protocol === NETWORK_TEST_PROTOCOLS.UDP
          ? PROTOCOL.UDP
          : PROTOCOL.TCP;
      if (row.status === undefined) {
        const {
          initialFrequency,
          initialTime,
          initialDay,
        } = getParsedCronString({cronString: row.cron_expr || ''});
        return {
          id: row.id,
          rowId: 'schedule' + row.id,
          filterStatus: row.enabled ? 'SCHEDULED' : 'PAUSED',
          type: NETWORK_TEST_TYPES[row.test_type.toLowerCase()],
          start: row.enabled ? (
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
          status: row.enabled ? (
            <Grid container spacing={1}>
              <Grid item>{EXECUTION_DEFS.SCHEDULED.icon}</Grid>
              <Grid item>
                <div className={classes.statusText}>{initialFrequency}</div>
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={1}>
              <Grid item>{EXECUTION_DEFS.PAUSED.icon}</Grid>
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
                  id={row.id}
                  onActionClick={handleActionClick}
                  initialOptions={row.iperf_options || {}}
                  type={TEST_TYPE_CODES[row.test_type] || ''}
                  initialCronString={row.cron_expr || ''}
                />
              }
              onDeleteSchedule={deleteSchedule}
              onSetDisableSchedule={id =>
                setDisableSchedule({
                  iperfOptions: row.iperf_options || {},
                  cronExpr: row.cron_expr || '',
                  enabled: !row.enabled,
                  id,
                })
              }
              row={row}
            />
          ),
        };
      } else if (isTestRunning(row.status)) {
        const runningExecution =
          row.status &&
          EXECUTION_STATUS[row.status] === EXECUTION_STATUS.RUNNING;
        return {
          id: row.id,
          rowId: 'execution' + row.id,
          type: throughputTestMode
            ? NETWORK_TEST_TYPES.partial
            : NETWORK_TEST_TYPES[row.test_type.toLowerCase()],
          filterStatus: row.status,
          start: getFormattedDateAndTime({date: row.start_dt || ''}),
          status: (
            <Grid container spacing={1}>
              <Grid item>{EXECUTION_DEFS.RUNNING.icon}</Grid>
              <Grid item>
                <div className={classes.statusText}>
                  {runningExecution ? 'In progress' : 'Processing'}
                </div>
              </Grid>
            </Grid>
          ),
          protocol,
          actions: runningExecution && (
            <div className={classes.executionActionButtonContainer}>
              {
                <Button onClick={() => abortExecution(row.id)}>
                  {BUTTON_TYPES.abort}
                </Button>
              }
            </div>
          ),
        };
      } else {
        const filterStatus = row.status;
        return {
          id: row.id,
          rowId: 'execution' + row.id,
          filterStatus,
          type: throughputTestMode
            ? NETWORK_TEST_TYPES.partial
            : NETWORK_TEST_TYPES[row.test_type.toLowerCase()],
          start: getFormattedDateAndTime({date: row.start_dt || ''}),
          status: (
            <Grid container spacing={1}>
              <Grid item>{EXECUTION_DEFS[filterStatus].icon}</Grid>
              <Grid item>
                <div className={classes.statusText}>
                  {getFormattedDateAndTime({date: row.end_dt || ''})}
                </div>
              </Grid>
            </Grid>
          ),
          protocol,
          actions:
            row.status &&
            EXECUTION_STATUS[row.status] !== EXECUTION_STATUS.FAILED ? (
              <div className={classes.executionActionButtonContainer}>
                {<ResultExport id={String(row.id)} />}
              </div>
            ) : null,
        };
      }
    }
  });

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
      tableOptions={{
        optionsInput,
        onOptionsUpdate: handleFilterOptions,
      }}
    />
  );
}

function filterData(data, filterOptions) {
  const taco = data?.filter(row => {
    const correctProtocol =
      !filterOptions?.protocol ||
      filterOptions?.protocol.find(
        protocol => protocol === row.iperf_options.protocol,
      );
    const correctDate =
      row.cron_expr ||
      !filterOptions?.startTime ||
      (typeof row.start_dt === 'string' &&
        new Date(row.start_dt).getTime() >
          new Date(filterOptions?.startTime || '').getTime());

    const rowTestType = row.whitelist
      ? 'partial'
      : TEST_TYPE_CODES[row.test_type];

    const correctType =
      !filterOptions?.testType ||
      filterOptions?.testType.find(type => type === rowTestType);

    const scheduleStatus = row.enabled ? 'SCHEDULED' : 'PAUSED';
    const rowStatus = row.status ?? scheduleStatus;

    const correctStatus =
      !filterOptions?.status ||
      filterOptions?.status.find(status => status === rowStatus?.toLowerCase());

    return correctProtocol && correctDate && correctType && correctStatus;
  });

  return taco || [];
}
