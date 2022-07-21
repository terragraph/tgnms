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
import * as scanApi from '@fbcnms/tg-nms/app/apiutils/ScanServiceAPIUtil';
import EditScanModal from './EditScanModal';
import Grid from '@material-ui/core/Grid';
import ResultExport from '@fbcnms/tg-nms/app/components/scheduler/ResultExport';
import ScheduleActions from '@fbcnms/tg-nms/app/components/scheduler/ScheduleActions';
import ScheduleScanModal from './ScheduleScanModal';
import ScheduleTable from '@fbcnms/tg-nms/app/components/scheduler/ScheduleTable';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import useUnmount from '@fbcnms/tg-nms/app/hooks/useUnmount';
import {
  EXECUTION_DEFS,
  FREQUENCIES,
  SCAN_EXECUTION_STATUS,
  SCAN_MODE,
  SCAN_SERVICE_MODE,
  SCAN_SERVICE_TYPES,
  SCAN_TYPES,
  SCHEDULE_TABLE_TYPES,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {
  getDateNth,
  getFormattedDateAndTime,
  getParsedCronString,
} from '@fbcnms/tg-nms/app/helpers/ScheduleHelpers';
import {makeStyles} from '@material-ui/styles';
import {useLoadScanTableData} from '@fbcnms/tg-nms/app/hooks/ScanServiceHooks';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

import type {CreateUrl} from '@fbcnms/tg-nms/app/components/scheduler/SchedulerTypes';
import type {FilterOptionsType} from '@fbcnms/tg-nms/shared/dto/ScanServiceTypes';
import type {TableResultType} from '@fbcnms/tg-nms/app/features/scans/ScanServiceTypes';

type Props = {
  createScanUrl: CreateUrl,
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

export default function ScanService(props: Props) {
  const classes = useStyles();
  const snackbars = useSnackbars();
  const {createScanUrl, selectedExecutionId} = props;
  const [shouldUpdate, setShouldUpdate] = React.useState(false);
  const [filterOptions, setFilterOptions] = React.useState<?FilterOptionsType>(
    null,
  );
  const {networkName, nodeMap, macToNodeMap} = useNetworkContext();

  const handleFilterOptions = React.useCallback(query => {
    setFilterOptions({
      ...query,
      status: query.status?.map(status => status.toLowerCase()),
    });
  }, []);

  const updateRef = useLiveRef(shouldUpdate);
  const runningScanTimeoutRef = React.useRef<?TimeoutID>(null);
  const actionTimeoutRef = React.useRef<?TimeoutID>(null);

  const handleDataUpdate = React.useCallback(() => {
    actionTimeoutRef.current = setTimeout(() => {
      setShouldUpdate(!updateRef.current);
    }, 1000);
  }, [setShouldUpdate, updateRef]);

  useUnmount(() => {
    if (runningScanTimeoutRef.current != null) {
      clearTimeout(runningScanTimeoutRef.current);
    }
    if (actionTimeoutRef.current != null) {
      clearTimeout(actionTimeoutRef.current);
    }
  });

  const deleteSchedule = async id => {
    if (id == null) {
      return;
    }
    try {
      await scanApi.deleteSchedule({
        scheduleId: id,
      });
      handleDataUpdate();
      snackbars.success('Successfully deleted scan schedule!');
    } catch (err) {
      snackbars.error('Failed to delete scan schedule: ' + err);
    }
  };

  const setDisableSchedule = async input => {
    if (input.id == null) {
      return;
    }
    try {
      await scanApi.editScanSchedule({
        inputData: {
          ...input,
          networkName,
        },
        scheduleId: input.id,
      });
      handleDataUpdate();
      snackbars.success(
        `Successfully ${input.enabled ? 'resumed' : 'paused'} scan schedule!`,
      );
    } catch (err) {
      snackbars.error(
        `Failed to ${input.enabled ? 'resume' : 'pause'} scan schedule: ` + err,
      );
    }
  };

  const inputData = {
    networkName,
    startTime: filterOptions?.startTime,
  };

  const {loading, data} = useLoadScanTableData({
    filterOptions,
    inputData,
    actionUpdate: shouldUpdate,
  });

  const getItemName = (row, networkName) =>
    row.options.tx_wlan_mac
      ? `${nodeMap[macToNodeMap[row.options.tx_wlan_mac]].site_name}: ${
          row.options.tx_wlan_mac
        }`
      : `${networkName}`;

  const scanRows = data?.map((row: TableResultType) => {
    const mode = row.mode;
    if (row.status === undefined) {
      const {initialFrequency, initialTime, initialDay} = getParsedCronString({
        cronString: row.cron_expr || '',
      });
      const time = initialTime.split(',')[1];
      return {
        id: row.id,
        rowId: 'schedule' + row.id,
        filterStatus: row.enabled ? 'SCHEDULED' : 'PAUSED',
        item: getItemName(row, row.network_name),
        type: SCAN_SERVICE_TYPES[row.type],
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
                    : 'monthly on the ' + getDateNth({date: Number(initialDay)})
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
        mode,
        actions: (
          <ScheduleActions
            editButton={
              <EditScanModal
                id={row.id}
                onActionClick={handleDataUpdate}
                mode={row.mode}
                type={row.type}
                initialCronString={row.cron_expr || ''}
                tx_wlan_mac={row.options.tx_wlan_mac}
              />
            }
            onDeleteSchedule={deleteSchedule}
            onSetDisableSchedule={id =>
              setDisableSchedule({
                mode: SCAN_MODE[row.mode] || '',
                type: SCAN_TYPES[row.type] || '',
                cronExpr: row.cron_expr || '',
                enabled: !row.enabled,
                id,
              })
            }
            row={row}
          />
        ),
      };
    } else if (
      SCAN_EXECUTION_STATUS[row.status] === SCAN_EXECUTION_STATUS.RUNNING
    ) {
      return {
        id: row.id,
        rowId: 'execution' + row.id,
        type: SCAN_SERVICE_TYPES[row.type],
        filterStatus: row.status,
        item: getItemName(row, row.network_name),
        start: getFormattedDateAndTime({date: row.start_dt || ''}),
        status: (
          <Grid container spacing={1}>
            <Grid item>{EXECUTION_DEFS.RUNNING.icon}</Grid>
            <Grid item>
              <div className={classes.statusText}>In progress</div>
            </Grid>
          </Grid>
        ),
        mode,
      };
    } else if (
      SCAN_EXECUTION_STATUS[row.status] === SCAN_EXECUTION_STATUS.QUEUED
    ) {
      return {
        id: row.id,
        rowId: 'execution' + row.id,
        type: SCAN_SERVICE_TYPES[row.type],
        filterStatus: row.status,
        item: getItemName(row, row.network_name),
        start: 'In queue to start',
        status: (
          <Grid container spacing={1}>
            <Grid item>{EXECUTION_DEFS.QUEUED.icon}</Grid>
            <Grid item>
              <div className={classes.statusText}>In queue</div>
            </Grid>
          </Grid>
        ),
        mode,
      };
    } else {
      const filterStatus = row.status;
      return {
        id: row.id,
        rowId: 'execution' + row.id,
        filterStatus,
        item: getItemName(row, row.network_name),
        type: SCAN_SERVICE_TYPES[row.type],
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
        mode,
        actions:
          row.status &&
          SCAN_EXECUTION_STATUS[row.status] !== SCAN_EXECUTION_STATUS.FAILED ? (
            <div className={classes.executionActionButtonContainer}>
              {<ResultExport id={String(row.id)} />}
            </div>
          ) : null,
      };
    }
  });

  const optionsInput = React.useMemo(
    () => [
      {
        name: 'type',
        title: 'Type',
        initialValue: Object.keys(SCAN_SERVICE_TYPES).map(type => type),
        options: Object.keys(SCAN_SERVICE_TYPES).map(type => ({
          type,
          title: SCAN_SERVICE_TYPES[type],
        })),
      },
      {
        name: 'mode',
        title: 'Mode',
        initialValue: Object.keys(SCAN_SERVICE_MODE).map(
          key => SCAN_SERVICE_MODE[key],
        ),
        options: Object.keys(SCAN_SERVICE_MODE).map(key => ({
          type: SCAN_SERVICE_MODE[key],
          title: SCAN_SERVICE_MODE[key],
        })),
      },
      {
        name: 'status',
        title: 'Status',
        initialValue: Object.keys(SCAN_EXECUTION_STATUS).map(status => status),
        options: Object.keys(SCAN_EXECUTION_STATUS).map(status => ({
          type: status,
          title: SCAN_EXECUTION_STATUS[status],
        })),
      },
    ],
    [],
  );

  const filteredRows = React.useMemo(
    () =>
      scanRows?.filter(row => {
        const correctMode =
          !filterOptions?.mode ||
          filterOptions?.mode.find(
            mode => row.mode && mode === SCAN_SERVICE_MODE[row.mode],
          );

        const correctDateFilterStatus =
          row.filterStatus === 'SCHEDULED' ||
          row.filterStatus === 'PAUSED' ||
          row.filterStatus === 'QUEUED';

        const inTimeRange =
          typeof row.start === 'string' &&
          new Date(row.start).getTime() >
            new Date(filterOptions?.startTime || '').getTime();

        const correctDate =
          !filterOptions?.startTime || correctDateFilterStatus || inTimeRange;

        const correctType =
          !filterOptions?.type ||
          filterOptions?.type.find(
            type => SCAN_SERVICE_TYPES[type] === row.type,
          );
        const correctStatus =
          !filterOptions?.status ||
          filterOptions?.status.find(
            status => status === row.filterStatus.toLowerCase(),
          );
        return correctMode && correctDate && correctType && correctStatus;
      }),
    [scanRows, filterOptions],
  );

  return (
    <ScheduleTable
      schedulerModal={<ScheduleScanModal onActionClick={handleDataUpdate} />}
      createURL={createScanUrl}
      selectedExecutionId={selectedExecutionId}
      rows={filteredRows || []}
      loading={loading}
      filterOptions={filterOptions || {}}
      tableOptions={{
        optionsInput,
        onOptionsUpdate: handleFilterOptions,
      }}
      mode={SCHEDULE_TABLE_TYPES.SCAN}
    />
  );
}
