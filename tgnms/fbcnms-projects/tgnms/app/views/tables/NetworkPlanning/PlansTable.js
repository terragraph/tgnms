/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import BackButton from './BackButton';
import Button from '@material-ui/core/Button';
import CreatePlanModal from './CreatePlanModal';
import Grid from '@material-ui/core/Grid';
import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import PlanActionsMenu from './PlanActionsMenu';
import PlanStatus from '@fbcnms/tg-nms/app/features/planning/components/PlanStatus';
import React from 'react';
import grey from '@material-ui/core/colors/grey';
import useInterval from '@fbcnms/ui/hooks/useInterval';
import {NETWORK_PLAN_STATE} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {
  PLANNING_BASE_PATH,
  PLANNING_FOLDER_PATH,
  PLANNING_PLAN_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';
import {
  PLAN_ID_QUERY_KEY,
  useNetworkPlanningContext,
} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {
  generatePath,
  matchPath,
  useHistory,
  useLocation,
  useParams,
} from 'react-router-dom';
import {makeStyles} from '@material-ui/styles';
import {useFolderPlans} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import type {NetworkPlan} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {NetworkTableProps} from '../NetworkTables';

const useStyles = makeStyles(() => ({
  actionsButton: {display: 'flex', width: '100%', justifyContent: 'end'},
}));

export default function PlansTable(_props: NetworkTableProps) {
  const classes = useStyles();
  const match = useParams();
  const location = useLocation();
  const history = useHistory();
  const folderId = match?.folderId ?? '';
  const createPlanModal = useModalState();
  const {plan, selectedPlanId, setSelectedPlanId} = useNetworkPlanningContext();
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
        width: 100,
      },
      {
        title: 'Status',
        field: 'state',
        width: 100,
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
      rowStyle: makeRowStyle,
    }),
    [makeRowStyle],
  );

  const handleRowClick = React.useCallback(
    (_, row: NetworkPlan) => {
      setSelectedPlanId(row.id);
    },
    [setSelectedPlanId],
  );

  // Open the PlanView if the plan is successful or a draft
  React.useEffect(() => {
    if (selectedPlanId && plan?.state === NETWORK_PLAN_STATE.SUCCESS) {
      const match = matchPath(location.pathname, {
        path: PLANNING_FOLDER_PATH,
      });
      const newPath = generatePath(PLANNING_PLAN_PATH, {
        view: match?.params?.view ?? '',
        networkName: match?.params?.networkName ?? '',
        folderId: match?.params?.folderId ?? '',
      });
      history.replace({
        pathname: newPath,
        search: `?${PLAN_ID_QUERY_KEY}=${selectedPlanId}`,
      });
    }
  }, [selectedPlanId, location, history, plan]);

  /**
   * Passing a lambda with every render causes Component to unmount/remount
   * on every render. This normally isn't a problem, but PlanActionsComponent
   * uses a Menu. If a render occurs while the user has the menu open,
   * the menu will close.
   */
  const PlanActionsComponent = React.useCallback(
    props => (
      <div className={classes.actionsButton}>
        <PlanActionsMenu
          key={props.data.id}
          plan={props.data}
          onComplete={refreshPlans}
        />
      </div>
    ),
    [classes, refreshPlans],
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
          {
            Component: PlanActionsComponent,
          },
        ]}
      />
      <CreatePlanModal
        isOpen={createPlanModal.isOpen}
        onClose={createPlanModal.close}
        onComplete={() => refreshPlans()}
      />
    </>
  );
}
