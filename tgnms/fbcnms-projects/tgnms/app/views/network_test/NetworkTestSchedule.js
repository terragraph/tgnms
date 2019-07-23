/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';

import type {TestSchedule} from '../../../shared/dto/TestSchedule';

import Button from '@material-ui/core/Button';
import DeleteIcon from '@material-ui/icons/DeleteOutline';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import red from '@material-ui/core/colors/red';
import {Link} from 'react-router-dom';
import {generatePath} from 'react-router';
import {makeStyles} from '@material-ui/styles';
import type {ContextRouter} from 'react-router-dom';

import CustomTable from '../../components/common/CustomTable';
import LoadingBox from '../../components/common/LoadingBox';

import * as api from '../../apiutils/NetworkTestAPIUtil';
import FriendlyText from '../../components/common/FriendlyText';
import TestTypeCell, {convertTestCodeToString} from './TestTypeCell';
import axios from 'axios';
import {useLoadTestExecution} from './hooks';
import type {CancelToken} from 'axios';

type Props = {} & ContextRouter;

const useStyles = makeStyles(theme => ({
  schedule: {
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    minHeight: '80vh',
    height: '100%',
    maxHeight: '80vh',
  },
  tableWrapper: {
    height: 500,
  },
  loadingBox: {
    top: '50%',
    left: '50%',
  },
}));

export default function NetworkTestSchedule(props: Props) {
  const classes = useStyles();
  const {loading, tableProps} = useNetworkTestScheduleTable({
    networkName: props.match.params.networkName,
  });
  const [selectedRow, setSelectedRow] = React.useState(null);
  const handleRowSelect = React.useCallback(
    row => {
      setSelectedRow(row);
    },
    [setSelectedRow],
  );
  return (
    <>
      <Grid xs={12} container item spacing={1}>
        <Grid item>
          <Button
            component={Link}
            to={generatePath('/network_test/:networkName', props.match.params)}
            variant="outlined">
            View Tests
          </Button>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Paper className={classes.schedule}>
          <Typography variant="h6" component="h2">
            Test Schedule
          </Typography>
          <Grid
            container
            item
            className={classes.tableWrapper}
            justify="center">
            {loading ? (
              <LoadingBox className={classes.loadingBox} fullScreen={false} />
            ) : (
              <CustomTable {...tableProps} onRowSelect={handleRowSelect} />
            )}
          </Grid>
        </Paper>
      </Grid>
      {selectedRow && (
        <TestExecutionDialog
          onClose={() => setSelectedRow(null)}
          executionId={selectedRow.test_run_execution_id}
        />
      )}
    </>
  );
}

function useNetworkTestScheduleTable({networkName}: {networkName: ?string}) {
  const [rows, setRows] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [scheduleToDelete, setScheduleToDelete] = React.useState(null);

  const loadTestSchedule = React.useCallback(
    (cancelToken?: CancelToken) => {
      if (!networkName) {
        return;
      }
      setLoading(true);
      api
        .getTestSchedule({
          networkName,
          cancelToken,
        })
        .then(scheduleRows => {
          setRows(scheduleRows);
          setLoading(false);
        });
    },
    [networkName, setRows, setLoading],
  );
  // load the table rows
  React.useEffect(() => {
    if (!networkName) {
      return;
    }
    const source = axios.CancelToken.source();
    loadTestSchedule(source.token);
    return () => source.cancel();
  }, [loadTestSchedule, networkName]);

  const deleteSchedule = React.useCallback(() => {
    if (scheduleToDelete == null) {
      return;
    }
    const source = axios.CancelToken.source();
    setLoading(true);
    return api
      .deleteTestSchedule({
        scheduleId: scheduleToDelete,
        cancelToken: source.token,
      })
      .then(() => {
        setScheduleToDelete(null);
        loadTestSchedule();
      });
  }, [scheduleToDelete, setScheduleToDelete, loadTestSchedule]);

  const tableProps = React.useMemo(() => {
    const tableDimensions = {
      rowHeight: 60,
      headerHeight: 80,
      overscanRowCount: 10,
    };

    const columns = [
      {
        key: 'test_code',
        label: 'Type',
        width: 100,
        render: test_code => <TestTypeCell test_code={test_code} />,
      },
      cronColumn('cron_minute'),
      cronColumn('cron_hour'),
      cronColumn('cron_day_of_month'),
      cronColumn('cron_month'),
      cronColumn('cron_day_of_week'),
      {
        key: 'actions',
        label: '',
        width: 100,
        render: (_, row: TestSchedule) => {
          return (
            <span>
              <Tooltip title="Delete this schedule" placement="top">
                <IconButton
                  onClick={e => {
                    e.stopPropagation();
                    setScheduleToDelete(row.id);
                  }}>
                  <DeleteIcon />
                  {scheduleToDelete != null && (
                    <ConfirmDeleteSchedule onConfirm={deleteSchedule} />
                  )}
                </IconButton>
              </Tooltip>
            </span>
          );
        },
      },
    ];

    return {
      ...tableDimensions,
      columns,
      data: rows,
    };
  }, [rows, scheduleToDelete, deleteSchedule]);

  return {
    tableProps,
    loading,
  };
}

const useDialogStyles = makeStyles(_theme => ({
  capitalize: {
    textTransform: 'capitalize',
  },
}));
function TestExecutionDialog({
  executionId,
  onClose,
}: {
  executionId: string,
  onClose: () => any,
}) {
  const {execution, loading} = useLoadTestExecution({executionId});
  const classes = useDialogStyles();
  return (
    <Dialog open={!!executionId} onClose={onClose}>
      <DialogTitle id="alert-dialog-title">Test Execution</DialogTitle>
      {loading && <LoadingBox fullScreen={false} />}
      {!loading && execution && (
        <DialogContent>
          <Typography className={classes.capitalize}>
            {convertTestCodeToString(execution.test_code)}
          </Typography>
          <Typography>Protocol: {execution.protocol}</Typography>
          <Typography>
            Session Duration: {execution.session_duration}s
          </Typography>
          <Typography>Push Rate: {execution.test_push_rate}bits/sec</Typography>
          {execution.multi_hop_parallel_sessions != null && (
            <Typography>
              Parallel Multihop Sessions {execution.multi_hop_parallel_sessions}
            </Typography>
          )}
          {execution.multi_hop_session_iteration_count != null && (
            <Typography>
              Sequential Multihop Sessions{' '}
              {execution.multi_hop_session_iteration_count}
            </Typography>
          )}

          {/*TODO: show the rest of the parameters**/}
        </DialogContent>
      )}
      {!loading && !execution && <Typography>An error has occurred</Typography>}
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

const useDeleteStyles = makeStyles(_theme => ({
  danger: {
    color: red[600],
  },
}));
function ConfirmDeleteSchedule({onConfirm}) {
  const [open, setOpen] = React.useState(true);
  const classes = useDeleteStyles();
  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description">
      <DialogTitle id="alert-dialog-title">
        Confirm Schedule Deletion
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          This will remove this test schedule. Currently running tests will not
          be affected. This operation cannot be reversed.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          onClick={() => {
            onConfirm();
            setOpen(false);
          }}
          className={classes.danger}
          autoFocus>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function cronColumn(name: $Keys<TestSchedule>, overrides: Object = {}) {
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
