/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

import IconButton from '@material-ui/core/IconButton';
import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import {Link, generatePath, matchPath, useLocation} from 'react-router-dom';
import {NETWORK_TABLE_HEIGHTS} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {
  PLANNING_FOLDER_PATH,
  PLANNING_PLAN_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import type {NetworkTableProps} from '../NetworkTables';

export default function TopologyTable({tableHeight}: NetworkTableProps) {
  const {plan} = useNetworkPlanningContext();

  const tableOptions = React.useMemo(
    () => ({
      maxBodyHeight:
        tableHeight != null
          ? tableHeight -
            NETWORK_TABLE_HEIGHTS.MTABLE_FILTERING -
            NETWORK_TABLE_HEIGHTS.MTABLE_TOOLBAR
          : NETWORK_TABLE_HEIGHTS.MTABLE_MAX_HEIGHT,
    }),
    [tableHeight],
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
              <Typography variant="h6">Plan: {plan?.name}</Typography>
            </Grid>
          </Grid>
        }
        options={tableOptions}
      />
    </>
  );
}

function BackButton() {
  const {setSelectedPlanId} = useNetworkPlanningContext();
  const {pathname} = useLocation();
  const backUrl = React.useMemo(() => {
    const match = matchPath(pathname, {
      path: PLANNING_PLAN_PATH,
    });
    const newPath = generatePath(PLANNING_FOLDER_PATH, {
      view: match?.params?.view ?? '',
      networkName: match?.params?.networkName ?? '',
      folderId: match?.params?.folderId ?? '',
    });
    return newPath;
  }, [pathname]);
  return (
    <IconButton
      data-testid="back-to-plans"
      aria-label="Back to plans"
      onClick={() => setSelectedPlanId(null)}
      component={Link}
      to={backUrl}
      size="small"
      edge="start">
      <ArrowBackIcon fontSize="small" />
    </IconButton>
  );
}
