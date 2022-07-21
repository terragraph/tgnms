/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as testApi from '@fbcnms/tg-nms/app/apiutils/NetworkTestAPIUtil';
import Button from '@material-ui/core/Button';
import EditNetworkTestScheduleModal from './EditNetworkTestScheduleModal';
import Grid from '@material-ui/core/Grid';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import ResultExport from '@fbcnms/tg-nms/app/components/scheduler/ResultExport';
import ScheduleActions from '@fbcnms/tg-nms/app/components/scheduler/ScheduleActions';
import ScheduleNetworkTestModal from './ScheduleNetworkTestModal';
import ScheduleTable from '@fbcnms/tg-nms/app/components/scheduler/ScheduleTable';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import useUnmount from '@fbcnms/tg-nms/app/hooks/useUnmount';
import {
  BUTTON_TYPES,
  EXECUTION_DEFS,
  FREQUENCIES,
  NETWORK_TEST_PROTOCOLS,
  NETWORK_TEST_TYPES,
  PROTOCOL,
  SCHEDULE_TABLE_TYPES,
  TEST_EXECUTION_STATUS,
  TEST_TYPE_CODES,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {
  getDateNth,
  getFormattedDateAndTime,
  getParsedCronString,
} from '@fbcnms/tg-nms/app/helpers/ScheduleHelpers';
import {isTestRunning} from '@fbcnms/tg-nms/app/features/network_test/NetworkTestHelpers';
import {makeStyles} from '@material-ui/styles';
import {useHistory} from 'react-router';
import {useLoadTestTableData} from '@fbcnms/tg-nms/app/features/network_test/NetworkTestHooks';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

import type {CreateUrl} from '@fbcnms/tg-nms/app/components/scheduler/SchedulerTypes';
import type {
  FilterOptionsType,
  InputGetType,
} from '@fbcnms/tg-nms/shared/dto/NetworkTestTypes';

type Props = {
  createTestUrl: CreateUrl,
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
  const snackbars = useSnackbars();

  const {createTestUrl, selectedExecutionId} = props;
  const [shouldUpdate, setShouldUpdate] = React.useState(false);
  const [filterOptions, setFilterOptions] = React.useState<?FilterOptionsType>(
    null,
  );
  const {networkName} = React.useContext(NetworkContext);

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

        snackbars.success('Successfully stopped test!');
      })
      .catch(err => snackbars.error('Failed to stop test: ' + err));
  };

  const deleteSchedule = async id => {
    if (id == null) {
      return;
    }
    try {
      await testApi.deleteSchedule({
        scheduleId: id,
      });
      handleActionClick();
      snackbars.success('Successfully deleted test schedule!');
    } catch (err) {
      snackbars.error('Failed to delete test schedule: ' + err);
    }
  };

  const setDisableSchedule = async input => {
    if (input.id == null) {
      return;
    }
    try {
      await testApi.editTestSchedule({
        inputData: {
          enabled: input.enabled,
          cronExpr: input.cronExpr,
          networkName,
          iperfOptions: input.iperfOptions,
        },
        scheduleId: input.id,
      });
      handleActionClick();
      snackbars.success(
        `Successfully ${input.enabled ? 'resumed' : 'paused'} test schedule!`,
      );
    } catch (err) {
      snackbars.error(
        `Failed to ${input.enabled ? 'resume' : 'pause'} test schedule: ` + err,
      );
    }
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
    inputData.testType = 'sequential_node';
  }

  const {loading, data} = useLoadTestTableData({
    filterOptions: filterOptions || {},
    inputData,
    actionUpdate: shouldUpdate,
  });

  const rows = filterData(data, filterOptions).map(row => {
    {
      const partialMode = getPartialMode(row);

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
        const time = initialTime.split(',')[1];
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
            ', at' +
            time
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
                  ', at' +
                  time}
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
          TEST_EXECUTION_STATUS[row.status] === TEST_EXECUTION_STATUS.RUNNING;
        return {
          id: row.id,
          rowId: 'execution' + row.id,
          type: partialMode
            ? partialMode
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
          type: partialMode
            ? partialMode
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
            TEST_EXECUTION_STATUS[row.status] !==
              TEST_EXECUTION_STATUS.FAILED ? (
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
      initialValue: Object.keys(TEST_EXECUTION_STATUS).map(status => status),
      options: Object.keys(TEST_EXECUTION_STATUS).map(status => ({
        type: status,
        title: TEST_EXECUTION_STATUS[status],
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
      mode={SCHEDULE_TABLE_TYPES.TEST}
    />
  );
}

function filterData(data, filterOptions) {
  const filteredData = data?.filter(row => {
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

    const partialmode = getPartialMode(row);

    const rowTestType = partialmode
      ? partialmode
      : NETWORK_TEST_TYPES[TEST_TYPE_CODES[row.test_type]];

    const correctType =
      !filterOptions?.testType ||
      filterOptions?.testType.find(
        type => NETWORK_TEST_TYPES[type] === rowTestType,
      );

    const scheduleStatus = row.enabled ? 'SCHEDULED' : 'PAUSED';
    const rowStatus = row.status ?? scheduleStatus;

    const correctStatus =
      !filterOptions?.status ||
      filterOptions?.status.find(status => status === rowStatus?.toLowerCase());

    return correctProtocol && correctDate && correctType && correctStatus;
  });

  return filteredData || [];
}

function getPartialMode(row) {
  let partialMode = null;
  if (row.allowlist?.length === 1) {
    partialMode = NETWORK_TEST_TYPES.partial;
  } else if (
    row.allowlist?.length > 1 &&
    NETWORK_TEST_TYPES[row.test_type.toLowerCase()] ===
      NETWORK_TEST_TYPES.sequential_node
  ) {
    partialMode = NETWORK_TEST_TYPES.incremental_route;
  } else if (
    row.allowlist?.length > 1 &&
    NETWORK_TEST_TYPES[row.test_type.toLowerCase()] ===
      NETWORK_TEST_TYPES.parallel_link
  ) {
    partialMode = NETWORK_TEST_TYPES.p2mp;
  } else if (
    row.allowlist?.length > 1 &&
    NETWORK_TEST_TYPES[row.test_type.toLowerCase()] ===
      NETWORK_TEST_TYPES.parallel_node
  ) {
    partialMode = NETWORK_TEST_TYPES.congestion;
  }

  return partialMode;
}
