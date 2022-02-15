/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import CustomTable from '@fbcnms/tg-nms/app/components/common/CustomTable';
import FriendlyText from '@fbcnms/tg-nms/app/components/common/FriendlyText';
import Grid from '@material-ui/core/Grid';
import LoadingBox from '@fbcnms/tg-nms/app/components/common/LoadingBox';
import Paper from '@material-ui/core/Paper';
import ScheduleTableFaultWarning from './ScheduleTableFaultWarning';
import TableOptions from './TableOptions';
import {
  EXECUTION_STATUS,
  SCAN_EXECUTION_STATUS,
  SCHEDULE_TABLE_TYPES,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {makeStyles} from '@material-ui/styles';
import {useHistory} from 'react-router';

import type {CreateUrl} from './SchedulerTypes';
import type {ScheduleTableRow} from './SchedulerTypes';
import type {Props as TableOptionsType} from './TableOptions';

type Props<T> = {
  schedulerModal: React.Node,
  createURL: CreateUrl,
  selectedExecutionId?: ?string,
  rows: Array<ScheduleTableRow>,
  loading: boolean,
  tableOptions: TableOptionsType<T>,
  mode: $Values<typeof SCHEDULE_TABLE_TYPES>,
};

const useStyles = makeStyles(theme => ({
  schedule: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowX: 'hidden !important',
  },
  header: {
    flexGrow: 0,
    flexShrink: 0,
    padding: theme.spacing(1),
  },
  executionsTableWrapper: {
    overflow: 'auto',
    flexGrow: '1',
    paddingBottom: theme.spacing(2),
  },
  scheduleModal: {
    float: 'right',
    padding: theme.spacing(2),
  },
  loadingBox: {
    top: '5%',
    left: '50%',
  },
  errorTitle: {
    textTransform: 'capitalize',
    fontWeight: 700,
  },
  errorMessage: {
    color: theme.palette.grey[600],
    textAlign: 'center',
  },
}));

export default function ScheduleTable<T>(props: Props<T>) {
  const classes = useStyles();
  const {
    schedulerModal,
    selectedExecutionId,
    createURL,
    rows,
    loading,
    tableOptions,
    mode,
  } = props;

  const history = useHistory();

  const [selectedRow, setSelectedRow] = React.useState(null);

  React.useEffect(() => {
    if (selectedExecutionId) {
      setSelectedRow(
        rows?.find(
          row =>
            row.id === selectedExecutionId &&
            EXECUTION_STATUS[row.filterStatus] !== EXECUTION_STATUS.FAILED &&
            EXECUTION_STATUS[row.filterStatus] !== EXECUTION_STATUS.SCHEDULED,
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (selectedRow && selectedRow?.id) {
      history.push(
        createURL({
          executionId: selectedRow.id.toString(),
        }),
      );
    }
  }, [createURL, history, selectedExecutionId, selectedRow]);

  const tableProps = React.useMemo(() => {
    const tableDimensions = {
      rowHeight: 60,
      headerHeight: 40,
      overscanRowCount: 10,
    };

    const columns = [
      scheduleColumn('type', {width: 130}),
      ...(mode === SCHEDULE_TABLE_TYPES.SCAN
        ? [scheduleColumn('item', {width: 160})]
        : []),
      scheduleColumn('start', {width: 160}),
      scheduleColumn('status', {width: 120}),
      scheduleColumn(mode === SCHEDULE_TABLE_TYPES.SCAN ? 'mode' : 'protocol', {
        width: 70,
      }),
      scheduleColumn('actions', {width: 70}),
      {
        label: 'rowId',
        key: 'rowId',
        isKey: true,
        hidden: true,
      },
    ];

    return {
      ...tableDimensions,
      columns,
      data: rows,
    };
  }, [rows, mode]);

  const handleRowSelect = React.useCallback(
    row => {
      if (
        EXECUTION_STATUS[row.filterStatus] !== EXECUTION_STATUS.FAILED &&
        EXECUTION_STATUS[row.filterStatus] !== EXECUTION_STATUS.SCHEDULED &&
        EXECUTION_STATUS[row.filterStatus] !== EXECUTION_STATUS.PAUSED &&
        EXECUTION_STATUS[row.filterStatus] !== SCAN_EXECUTION_STATUS.QUEUED
      ) {
        setSelectedRow(row);
      }
    },
    [setSelectedRow],
  );

  return (
    <Grid item xs={12}>
      <Paper className={classes.schedule} elevation={2}>
        <Grid container item className={classes.header}>
          <Grid item xs={8}>
            <TableOptions {...tableOptions} />
          </Grid>
          <Grid item xs={4}>
            <div className={classes.scheduleModal}>{schedulerModal}</div>
          </Grid>
        </Grid>
        <Grid
          container
          item
          className={classes.executionsTableWrapper}
          justifyContent="center">
          {loading && rows.length === 0 ? (
            <LoadingBox className={classes.loadingBox} fullScreen={false} />
          ) : !rows ? (
            <>
              <ScheduleTableFaultWarning mode={mode} />
              Failed to load, please try again.
            </>
          ) : tableProps.data?.length ? (
            <CustomTable
              selected={selectedRow ? Object.values(selectedRow) : []}
              {...tableProps}
              onRowSelect={handleRowSelect}
            />
          ) : (
            <Grid
              container
              item
              alignItems="center"
              direction={'column'}
              spacing={2}>
              <Grid item className={classes.errorTitle}>
                <ScheduleTableFaultWarning mode={mode} /> No {mode}s found
              </Grid>
              <Grid item xs={4} className={classes.errorMessage}>
                No scheduled or past {mode}s match the filters. Try selecting a
                different filter or scheduling a new {mode}.
              </Grid>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Grid>
  );
}

function scheduleColumn(name: string, overrides: Object = {}) {
  return {
    key: name,
    label: (
      <FriendlyText
        text={name}
        disableTypography
        separator="_"
        stripPrefix="cron"
      />
    ),
    width: 100,
    ...overrides,
  };
}
