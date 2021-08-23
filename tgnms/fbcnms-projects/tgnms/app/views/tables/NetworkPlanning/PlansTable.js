/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import Button from '@material-ui/core/Button';
import CreatePlanModal from './CreatePlanModal';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import PlanStatus from '@fbcnms/tg-nms/app/features/planning/components/PlanStatus';
import React from 'react';
import TableToolbar, {TableToolbarAction} from './TableToolbar';
import Typography from '@material-ui/core/Typography';
import grey from '@material-ui/core/colors/grey';
import useInterval from '@fbcnms/ui/hooks/useInterval';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {
  Link,
  generatePath,
  matchPath,
  useLocation,
  useParams,
} from 'react-router-dom';
import {NETWORK_TABLE_HEIGHTS} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {PLANNING_BASE_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {useFolderPlans} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import type {
  NetworkPlan,
  PlanFolder,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {NetworkTableProps} from '../NetworkTables';
import type {TaskState} from '@fbcnms/tg-nms/app/hooks/useTaskState';

export default function PlansTable({tableHeight}: NetworkTableProps) {
  const match = useParams();
  const folderId = match?.folderId ?? '';
  const createPlanModal = useModalState();
  const {selectedPlanId, setSelectedPlanId} = useNetworkPlanningContext();
  const {folder} = useLoadFolder({folderId});
  const {
    plans,
    taskState: loadPlansTask,
    refresh: refreshPlans,
  } = useFolderPlans({folderId});
  useInterval(() => {
    refreshPlans();
  }, 30000);

  const columns = React.useMemo(
    () => [
      {
        title: 'Name',
        field: 'name',
        grouping: false,
        width: 100,
      },
      {
        title: 'Status',
        field: 'state',
        grouping: false,
        width: 40,
        render: (rowData: NetworkPlan) => <PlanStatus state={rowData.state} />,
      },
    ],
    [],
  );
  const makeRowStyle = React.useCallback(
    (row: NetworkPlan) => ({
      backgroundColor:
        row.id.toString() === selectedPlanId ? grey[300] : undefined,
    }),
    [selectedPlanId],
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
      rowStyle: makeRowStyle,
      toolbarButtonAlignment: 'right',
      searchFieldStyle: {
        marginRight: '16px',
      },
      emptyRowsWhenPaging: false,
    }),
    [makeRowStyle, tableHeight],
  );

  const handleRowClick = React.useCallback(
    (event, row: NetworkPlan) => {
      setSelectedPlanId(row.id);
    },
    [setSelectedPlanId],
  );
  return (
    <>
      <MaterialTable
        title={
          <Grid container alignContent="center" alignItems="center" spacing={1}>
            <Grid item>
              <BackButton />
            </Grid>
            <Grid item>
              <Typography variant="h6">Folder: {folder?.name}</Typography>
            </Grid>
          </Grid>
        }
        data={plans}
        options={tableOptions}
        columns={columns}
        onRowClick={handleRowClick}
        isLoading={loadPlansTask.isLoading}
        actions={[
          {
            position: 'toolbar',
            Component: () => (
              <Button
                data-testid="add-plan-button"
                onClick={() => createPlanModal.open()}
                variant="outlined">
                Add Plan
              </Button>
            ),
          },
        ]}
        components={{
          Toolbar: TableToolbar,
          Action: TableToolbarAction,
        }}
      />
      <CreatePlanModal
        isOpen={createPlanModal.isOpen}
        onClose={createPlanModal.close}
        onComplete={() => refreshPlans()}
      />
    </>
  );
}

function BackButton() {
  const {setSelectedPlanId} = useNetworkPlanningContext();
  const {pathname} = useLocation();
  const backUrl = React.useMemo(() => {
    const match = matchPath(pathname, {
      path: PLANNING_BASE_PATH,
    });
    const newPath = generatePath(PLANNING_BASE_PATH, {
      view: match?.params.view ?? '',
      networkName: match?.params.networkName ?? '',
    });
    return newPath;
  }, [pathname]);
  return (
    <IconButton
      data-testid="back-to-folders"
      aria-label="Back to folders"
      onClick={() => setSelectedPlanId(null)}
      component={Link}
      to={backUrl}
      size="small"
      edge="start">
      <ArrowBackIcon fontSize="small" />
    </IconButton>
  );
}

/**
 * try to get the folder by id from the context folders, if it's not there,
 * load it. Doesn't modify context at all.
 */
function useLoadFolder({
  folderId,
}: {
  folderId: string,
}): {|folder: ?PlanFolder, taskState: TaskState|} {
  const taskState = useTaskState();
  const [folder, setFolder] = React.useState<?PlanFolder>();
  const {folders} = useNetworkPlanningContext();
  React.useEffect(() => {
    (async () => {
      try {
        taskState.loading();
        const _folder = (folders ?? {})[parseInt(folderId)];
        if (_folder != null) {
          setFolder(_folder);
        } else {
          const result = await networkPlanningAPIUtil.getFolder({folderId});
          if (result == null) {
            taskState.error();
            return;
          }
          setFolder(result);
          taskState.success();
        }
      } catch (err) {
        taskState.error();
        taskState.setMessage(err.message);
      }
    })();
  }, [folders, folderId, setFolder, taskState]);
  return {
    folder,
    taskState,
  };
}
