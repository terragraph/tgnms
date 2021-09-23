/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';

import IconButton from '@material-ui/core/IconButton';
import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import {Link, generatePath, matchPath, useLocation} from 'react-router-dom';
import {NETWORK_TABLE_HEIGHTS} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {
  PLANNING_FOLDER_PATH,
  PLANNING_PLAN_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {useNetworkPlanningManager} from '@fbcnms/tg-nms/app/features/planning/useNetworkPlanningManager';
import type {NetworkTableProps} from '../NetworkTables';

const useStyles = makeStyles(theme => ({
  table: {
    width: '100%',
  },
  header: {
    paddingLeft: theme.spacing(1),
  },
}));

export type RowSchema = {
  id: ?string,
  type: 'site' | 'link',
};

export default function TopologyTable({tableHeight}: NetworkTableProps) {
  const classes = useStyles();
  const {plan} = useNetworkPlanningContext();
  const {setPendingTopology} = useNetworkPlanningManager();
  const {mapFeatures} = useMapContext();

  const tableOptions = React.useMemo(
    () => ({
      selection: true,
      pageSize: 5,
      maxBodyHeight:
        tableHeight != null
          ? tableHeight -
            NETWORK_TABLE_HEIGHTS.MTABLE_FILTERING -
            NETWORK_TABLE_HEIGHTS.MTABLE_TOOLBAR
          : NETWORK_TABLE_HEIGHTS.MTABLE_MAX_HEIGHT,
    }),
    [tableHeight],
  );

  const columns = React.useMemo(
    () => [
      {
        title: 'Name',
        field: 'id',
        width: 10,
      },
    ],
    [],
  );

  const sites: RowSchema[] = React.useMemo(
    () =>
      mapFeatures?.sites
        ? Object.keys(mapFeatures.sites).map(key => ({
            id: mapFeatures.sites[key].site_id,
            type: 'site',
          }))
        : [],
    [mapFeatures],
  );

  const links: RowSchema[] = React.useMemo(
    () =>
      mapFeatures?.links
        ? Object.keys(mapFeatures.links).map(key => ({
            id: mapFeatures.links[key].link_id,
            type: 'link',
          }))
        : [],
    [mapFeatures],
  );

  const sitesSelectionCallback = React.useCallback(
    rows => {
      setPendingTopology(rows, 'sites');
    },
    [setPendingTopology],
  );

  const linksSelectionCallback = React.useCallback(
    rows => {
      setPendingTopology(rows, 'links');
    },
    [setPendingTopology],
  );
  return (
    <>
      <Grid
        container
        alignContent="center"
        alignItems="center"
        spacing={1}
        className={classes.header}>
        <Grid item>
          <BackButton />
        </Grid>
        <Grid item>
          <Typography variant="h6">Plan: {plan?.name}</Typography>
        </Grid>
      </Grid>
      <br />
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="sites-panel-content"
          id="sites-panel-header">
          <Typography>Sites</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <div className={classes.table}>
            <MaterialTable
              title={''}
              className={classes.table}
              data={sites}
              columns={columns}
              options={tableOptions}
              onSelectionChange={sitesSelectionCallback}
            />
          </div>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="links-panel-content"
          id="links-panel-header">
          <Typography>Links</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <div className={classes.table}>
            <MaterialTable
              title={''}
              data={links}
              columns={columns}
              options={tableOptions}
              onSelectionChange={linksSelectionCallback}
            />
          </div>
        </AccordionDetails>
      </Accordion>
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
