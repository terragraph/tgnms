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
import {
  ANP_SITE_TYPE_PRETTY,
  ANP_STATUS_TYPE_PRETTY,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import {Link, generatePath, matchPath, useLocation} from 'react-router-dom';
import {NETWORK_TABLE_HEIGHTS} from '@fbcnms/tg-nms/app/constants/StyleConstants';
import {
  PLANNING_FOLDER_PATH,
  PLANNING_PLAN_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';
import {isEmpty} from 'lodash';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {useNetworkPlanningManager} from '@fbcnms/tg-nms/app/features/planning/useNetworkPlanningManager';
import type {NetworkTableProps} from '../NetworkTables';

const useStyles = makeStyles(theme => ({
  table: {
    width: '100%',
  },
  header: {
    width: '100%',
    paddingLeft: theme.spacing(1),
  },
  noDropShadow: {
    borderBottom: '1px solid ' + theme.palette.divider,
    boxShadow: 'none',
    '&:last-child': {
      borderRadius: 0,
    },
  },
}));

const linkColumns = [
  {
    title: 'Name',
    field: 'id',
    width: 5,
  },
  {
    title: 'MCS',
    field: 'mcs',
    width: 10,
  },
  {
    title: 'SNR',
    field: 'snr',
    width: 10,
  },
  {
    title: 'Capacity',
    field: 'capacity',
    width: 10,
  },
  {
    title: 'Length',
    field: 'length',
    width: 10,
  },
];

const siteColumns = [
  {
    title: 'Name',
    field: 'id',
    width: 5,
  },
  {
    title: 'Site Type',
    field: 'site_type',
    width: 10,
  },
  {
    title: 'Latitude',
    field: 'latitude',
    width: 10,
  },
  {
    title: 'Longitude',
    field: 'longitude',
    width: 10,
  },
  {
    title: 'Status',
    field: 'status_type',
    width: 10,
  },
];

export type SiteRowSchema = {
  id: string,
  latitude: number,
  longitude: number,
  site_type: string,
  status_type: string,
};

export type LinkRowSchema = {
  id: string,
  mcs: number,
  snr: number,
  capacity: number,
  length: number,
};

export default function TopologyTable({tableHeight}: NetworkTableProps) {
  const classes = useStyles();
  const {plan} = useNetworkPlanningContext();
  const {filteredTopology, setPendingTopology} = useNetworkPlanningManager();

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

  const sites: SiteRowSchema[] = React.useMemo(() => {
    return !isEmpty(filteredTopology?.sites)
      ? objectValuesTypesafe(filteredTopology.sites).map(site => {
          return {
            id: site.site_id,
            latitude: site?.loc.latitude,
            longitude: site?.loc.longitude,
            site_type: ANP_SITE_TYPE_PRETTY[site?.site_type],
            status_type: ANP_STATUS_TYPE_PRETTY[site?.status_type],
          };
        })
      : [];
  }, [filteredTopology]);

  const links: LinkRowSchema[] = React.useMemo(() => {
    return !isEmpty(filteredTopology?.links)
      ? objectValuesTypesafe(filteredTopology.links).map(link => {
          return {
            id: link.link_id,
            mcs: link?.MCS,
            snr: link?.SNR,
            capacity: link?.capacity,
            length: link?.distance,
          };
        })
      : [];
  }, [filteredTopology]);

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
              columns={siteColumns}
              options={tableOptions}
              onSelectionChange={sitesSelectionCallback}
            />
          </div>
        </AccordionDetails>
      </Accordion>
      <Accordion className={classes.noDropShadow}>
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
              columns={linkColumns}
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
