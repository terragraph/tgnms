/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import BackButton from './BackButton';
import Button from '@material-ui/core/Button';
import CreatePlanModal from './CreatePlanModal';
import Grid from '@material-ui/core/Grid';
import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import PlanStatus from '@fbcnms/tg-nms/app/features/planning/components/PlanStatus';
import React from 'react';
import TableToolbar, {TableToolbarAction} from './TableToolbar';
import Typography from '@material-ui/core/Typography';
import grey from '@material-ui/core/colors/grey';
import useInterval from '@fbcnms/ui/hooks/useInterval';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {NETWORK_TABLE_HEIGHTS} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {
  PLANNING_BASE_PATH,
  PLANNING_FOLDER_PATH,
  PLANNING_PLAN_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';
import {
  generatePath,
  matchPath,
  useHistory,
  useLocation,
  useParams,
} from 'react-router-dom';
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
  const location = useLocation();
  const history = useHistory();
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
      minBodyHeight:
        tableHeight != null
          ? tableHeight -
            NETWORK_TABLE_HEIGHTS.MTABLE_PAGINATION -
            NETWORK_TABLE_HEIGHTS.MTABLE_TOOLBAR
          : NETWORK_TABLE_HEIGHTS.MTABLE_MAX_HEIGHT,
      maxBodyHeight:
        tableHeight != null
          ? tableHeight -
            NETWORK_TABLE_HEIGHTS.MTABLE_PAGINATION -
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
      const match = matchPath(location.pathname, {
        path: PLANNING_FOLDER_PATH,
      });
      const newPath = generatePath(PLANNING_PLAN_PATH, {
        view: match?.params?.view ?? '',
        networkName: match?.params?.networkName ?? '',
        folderId: match?.params?.folderId ?? '',
      });
      history.push(newPath);
      setSelectedPlanId(row.id);
    },
    [setSelectedPlanId, location, history],
  );
  return (
    <>
      <MaterialTable
        title={
          <Grid container alignContent="center" alignItems="center" spacing={1}>
            <Grid item>
              <BackButton
                from={PLANNING_FOLDER_PATH}
                to={PLANNING_BASE_PATH}
                label="Back to Projects"
                data-testid="back-to-projects"
              />
            </Grid>
            <Grid item>
              <Typography variant="h6">Project: {folder?.name}</Typography>
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
