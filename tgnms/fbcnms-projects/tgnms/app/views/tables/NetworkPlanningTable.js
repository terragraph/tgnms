/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import React from 'react';

import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import PlanStatus from '@fbcnms/tg-nms/app/components/mappanels/NetworkPlanningPanel/PlanStatus';
import grey from '@material-ui/core/colors/grey';
import useInterval from '@fbcnms/ui/hooks/useInterval';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {makeStyles} from '@material-ui/styles';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';

import type {ANPPlan} from '@fbcnms/tg-nms/shared/dto/ANP';

const useStyles = makeStyles(_theme => ({
  root: {
    height: '100%',
    overflow: 'auto',
  },
}));

export default function NetworkPlanningTable() {
  const classes = useStyles();
  const {networkName} = useNetworkContext();
  const {selectedPlanId, setSelectedPlanId} = useNetworkPlanningContext();
  const [lastRefreshDate, setLastRefreshDate] = React.useState(
    new Date().getTime(),
  );
  const [plans, setPlans] = React.useState<?Array<ANPPlan>>();

  const loadPlansTask = useTaskState();

  React.useEffect(() => {
    (async () => {
      try {
        loadPlansTask.setState(TASK_STATE.LOADING);
        const _plans = await networkPlanningAPIUtil.getPlansInFolder({
          name: 'tgnms',
        });
        setPlans(_plans);
        loadPlansTask.setState(TASK_STATE.SUCCESS);
      } catch (err) {
        loadPlansTask.setState(TASK_STATE.ERROR);
      }
    })();
  }, [networkName, lastRefreshDate, loadPlansTask]);
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
      showTitle: false,
      minBodyHeight: 200,
      maxBodyHeight: 500,
      pageSize: 20,
      pageSizeOptions: [20, 50, 100],
      padding: 'dense',
      filtering: true,
      tableLayout: 'fixed',
      rowStyle: makeRowStyle,
    }),
    [makeRowStyle],
  );

  const handleRowClick = React.useCallback(
    (event, row: ANPPlan) => {
      setSelectedPlanId(row.id);
    },
    [setSelectedPlanId],
  );

  return (
    <div className={classes.root}>
      <MaterialTable
        title="Network Plans"
        data={plans}
        options={tableOptions}
        columns={columns}
        onRowClick={handleRowClick}
        isLoading={loadPlansTask.isLoading}
      />
    </div>
  );
}
