/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import React from 'react';

import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import PlanStatus from '@fbcnms/tg-nms/app/features/planning/components/PlanStatus';
import TableToolbar from './TableToolbar';
import Typography from '@material-ui/core/Typography';
import grey from '@material-ui/core/colors/grey';
import useInterval from '@fbcnms/ui/hooks/useInterval';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {
  Link,
  generatePath,
  matchPath,
  useLocation,
  useParams,
} from 'react-router-dom';
import {NETWORK_TABLE_HEIGHTS} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {PLANNING_BASE_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import type {ANPFolder, ANPPlan} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {NetworkTableProps} from '../NetworkTables';
import type {TaskState} from '@fbcnms/tg-nms/app/hooks/useTaskState';

export default function PlansTable({tableHeight}: NetworkTableProps) {
  const match = useParams();
  const folderId = match?.folderId ?? '';
  const {selectedPlanId, setSelectedPlanId} = useNetworkPlanningContext();
  const [lastRefreshDate, setLastRefreshDate] = React.useState(
    new Date().getTime(),
  );
  const [plans, setPlans] = React.useState<?Array<ANPPlan>>();
  const loadPlansTask = useTaskState();
  const {folder} = useLoadFolder({folderId});
  React.useEffect(() => {
    (async () => {
      try {
        loadPlansTask.setState(TASK_STATE.LOADING);
        const _plans = await networkPlanningAPIUtil.getPlansInFolder({
          folderId: folderId,
        });
        setPlans(_plans);
        loadPlansTask.setState(TASK_STATE.SUCCESS);
      } catch (err) {
        loadPlansTask.setState(TASK_STATE.ERROR);
      }
    })();
  }, [folderId, lastRefreshDate, loadPlansTask]);
  useInterval(() => {
    setLastRefreshDate(new Date().getTime());
  }, 30000);
  const columns = React.useMemo(
    () => [
      {
        title: 'Name',
        field: 'plan_name',
        grouping: false,
        width: 100,
      },
      {
        title: 'Status',
        field: 'plan_status',
        grouping: false,
        width: 40,
        render: (rowData: ANPPlan) => (
          <PlanStatus status={rowData.plan_status} />
        ),
      },
    ],
    [],
  );
  const makeRowStyle = React.useCallback(
    (row: ANPPlan) => ({
      backgroundColor: row.id === selectedPlanId ? grey[300] : undefined,
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
      toolbarButtonAlignment: 'left',
    }),
    [makeRowStyle, tableHeight],
  );

  const handleRowClick = React.useCallback(
    (event, row: ANPPlan) => {
      setSelectedPlanId(row.id);
    },
    [setSelectedPlanId],
  );
  return (
    <MaterialTable
      title={
        <Grid container alignContent="center" alignItems="center" spacing={1}>
          <Grid item>
            <BackButton />
          </Grid>
          <Grid item>
            <Typography variant="h6">Folder: {folder?.folder_name}</Typography>
          </Grid>
        </Grid>
      }
      data={plans}
      options={tableOptions}
      columns={columns}
      onRowClick={handleRowClick}
      isLoading={loadPlansTask.isLoading}
      components={{
        Toolbar: TableToolbar,
      }}
    />
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
}): {|folder: ?ANPFolder, taskState: TaskState|} {
  const taskState = useTaskState();
  const [folder, setFolder] = React.useState<?ANPFolder>();
  const {folders} = useNetworkPlanningContext();
  React.useEffect(() => {
    (async () => {
      try {
        taskState.loading();
        const _folder = (folders ?? {})[folderId];
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
