/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import React from 'react';

import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import CreateNewFolderIcon from '@material-ui/icons/CreateNewFolder';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import TableToolbar from './TableToolbar';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import useInterval from '@fbcnms/ui/hooks/useInterval';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {NETWORK_TABLE_HEIGHTS} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {
  PLANNING_BASE_PATH,
  PLANNING_FOLDER_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';
import {
  generatePath,
  matchPath,
  useHistory,
  useLocation,
} from 'react-router-dom';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import type {ANPFolder} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {NetworkTableProps} from '../NetworkTables';

export default function FoldersTable({tableHeight}: NetworkTableProps) {
  const location = useLocation();
  const history = useHistory();
  const [lastRefreshDate, setLastRefreshDate] = React.useState(
    new Date().getTime(),
  );
  const [plans, setFolders] = React.useState<?Array<ANPFolder>>();
  const loadPlansTask = useTaskState();
  const createFolderModal = useModalState();
  React.useEffect(() => {
    (async () => {
      try {
        loadPlansTask.setState(TASK_STATE.LOADING);
        const folders = await networkPlanningAPIUtil.getFolders();
        setFolders(folders);
        loadPlansTask.setState(TASK_STATE.SUCCESS);
      } catch (err) {
        loadPlansTask.setState(TASK_STATE.ERROR);
      }
    })();
  }, [lastRefreshDate, loadPlansTask]);
  const refreshTable = () => setLastRefreshDate(new Date().getTime());
  useInterval(() => {
    refreshTable();
  }, 30000);

  const columns = React.useMemo(
    () => [
      {
        title: 'Name',
        field: 'folder_name',
        grouping: false,
        width: 100,
      },
    ],
    [],
  );
  const tableOptions = React.useMemo(
    () => ({
      showTitle: true,
      maxBodyHeight:
        tableHeight != null
          ? tableHeight -
            NETWORK_TABLE_HEIGHTS.MTABLE_FILTERING -
            NETWORK_TABLE_HEIGHTS.MTABLE_TOOLBAR
          : NETWORK_TABLE_HEIGHTS.MTABLE_MAX_HEIGHT,
      pageSize: 20,
      pageSizeOptions: [20, 50, 100],
      padding: 'dense',
      tableLayout: 'fixed',
      toolbarButtonAlignment: 'left',
    }),
    [tableHeight],
  );

  const handleRowClick = (event, row: ANPFolder) => {
    const match = matchPath(location.pathname, {
      path: PLANNING_BASE_PATH,
    });
    const newPath = generatePath(PLANNING_FOLDER_PATH, {
      view: match?.params.view ?? '',
      networkName: match?.params.networkName ?? '',
      folderId: row.id,
    });
    history.push(newPath);
  };
  return (
    <>
      <MaterialTable
        title="Folders"
        data={plans}
        options={tableOptions}
        columns={columns}
        onRowClick={handleRowClick}
        isLoading={loadPlansTask.isLoading}
        actions={[
          {
            isFreeAction: true,
            icon: CreateNewFolderIcon,
            tooltip: 'Create New Folder',
            onClick: (_event, _rowData) => {
              createFolderModal.open();
            },
          },
        ]}
        components={{
          Toolbar: TableToolbar,
        }}
      />
      <CreateFolderModal
        isOpen={createFolderModal.isOpen}
        onClose={createFolderModal.close}
        onComplete={refreshTable}
      />
    </>
  );
}

function CreateFolderModal({isOpen, onClose, onComplete}) {
  const taskState = useTaskState();
  const {formState, handleInputChange} = useForm<ANPFolder>({initialState: {}});
  const handleSubmitClick = React.useCallback(async () => {
    try {
      taskState.reset();
      taskState.loading();
      if (isNullOrEmptyString(formState.folder_name)) {
        throw new Error('Folder name is required');
      }
      await networkPlanningAPIUtil.createFolder(formState);
      taskState.success();
      onComplete();
      onClose();
    } catch (err) {
      taskState.setMessage(err.message);
      taskState.error();
    }
  }, [formState, taskState, onComplete, onClose]);
  return (
    <MaterialModal
      open={isOpen}
      onClose={onClose}
      modalTitle={'Create new plan folder'}
      modalContent={
        <Grid container direction="column">
          {taskState.isSuccess && (
            <Alert color="success" severity="success">
              <Typography>Plan created</Typography>
            </Alert>
          )}
          {taskState.isError && (
            <Alert color="error" severity="error">
              <Grid item container direction="column">
                <Grid item>
                  <Typography>Creating folder failed</Typography>
                </Grid>
                {taskState.message && (
                  <Grid item>
                    <Typography>{taskState.message}</Typography>
                  </Grid>
                )}{' '}
              </Grid>
            </Alert>
          )}
          <Grid item xs={8}>
            <TextField
              id="folder_name"
              onChange={handleInputChange(x => ({folder_name: x}))}
              value={formState.folder_name}
              placeholder="Folder Name"
              disabled={taskState.isLoading}
            />
          </Grid>
        </Grid>
      }
      modalActions={
        <>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button
            disabled={!validate(formState)}
            color="primary"
            onClick={handleSubmitClick}
            variant="contained">
            Submit{' '}
            {taskState.isLoading && (
              <CircularProgress size={10} style={{marginLeft: 5}} />
            )}
          </Button>
        </>
      }
    />
  );
}

function validate(folder: ANPFolder) {
  return !isNullOrEmptyString(folder.folder_name);
}
