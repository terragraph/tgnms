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
import BackButton from './BackButton';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Grid from '@material-ui/core/Grid';
import MaterialTable from '@fbcnms/tg-nms/app/components/common/MaterialTable';
import Typography from '@material-ui/core/Typography';
import {
  ANP_SITE_TYPE_PRETTY,
  ANP_STATUS_TYPE_PRETTY,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import {
  PLANNING_FOLDER_PATH,
  PLANNING_PLAN_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';
import {createLinkName} from '@fbcnms/tg-nms/app/features/planning/PlanningHelpers';
import {
  generatePath,
  matchPath,
  useHistory,
  useLocation,
} from 'react-router-dom';
import {isEmpty} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {useNetworkPlanningManager} from '@fbcnms/tg-nms/app/features/planning/useNetworkPlanningManager';
import type {NetworkTableProps} from '../NetworkTables';

const tableStyle = {
  boxShadow: 'none',
  width: '100%',
};
const useStyles = makeStyles(theme => ({
  summaryRoot: {
    paddingLeft: 0,
    flexDirection: 'row-reverse',
    '&.Mui-expanded': {
      minHeight: 'inherit',
      margin: '0 0',
    },
  },
  summaryContent: {
    '&.Mui-expanded': {
      margin: '0 0',
    },
  },
  details: {
    padding: '0',
  },
  header: {
    width: '100%',
    paddingLeft: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  accordion: {
    borderBottom: '1px solid ' + theme.palette.divider,
    boxShadow: 'none',
    '&:last-child': {
      borderRadius: 0,
    },
    '&.Mui-expanded': {
      margin: '0 0',
    },
  },
}));

const LINK_COLUMNS = [
  {
    title: 'Name',
    field: 'name',
    width: '40%',
  },
  {
    title: 'MCS',
    field: 'mcs',
    width: '15%',
  },
  {
    title: 'SNR',
    field: 'snr',
    width: '15%',
  },
  {
    title: 'Capacity',
    field: 'capacity',
    width: '15%',
  },
  {
    title: 'Length',
    field: 'length',
    width: '15%',
  },
];

const SITE_COLUMNS = [
  {
    title: 'Name',
    field: 'name',
    width: '40%',
  },
  {
    title: 'Site Type',
    field: 'site_type',
    width: '15%',
  },
  {
    title: 'Latitude',
    field: 'latitude',
    width: '15%',
  },
  {
    title: 'Longitude',
    field: 'longitude',
    width: '15%',
  },
  {
    title: 'Status',
    field: 'status_type',
    width: '15%',
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

export default function TopologyTable(_props: NetworkTableProps) {
  const classes = useStyles();
  const history = useHistory();
  const {pathname} = useLocation();
  const {plan} = useNetworkPlanningContext();
  const {
    filteredTopology,
    setPendingTopology,
    appendPendingTopology,
    removeFromPendingTopology,
    pendingTopology,
  } = useNetworkPlanningManager();

  const tableOptions = React.useMemo(
    () => ({
      selection: true,
      minBodyHeight: 400,
      maxBodyHeight: 400,
      pageSize: 10,
      pageSizeOptions: [5, 10, 20],
    }),
    [],
  );

  // Open the Plans Table if no plan is selected anymore.
  React.useEffect(() => {
    if (!plan) {
      const match = matchPath(pathname, {
        path: PLANNING_PLAN_PATH,
      });
      const newPath = generatePath(PLANNING_FOLDER_PATH, {
        view: match?.params?.view ?? '',
        networkName: match?.params?.networkName ?? '',
        folderId: match?.params?.folderId ?? '',
      });
      history.push(newPath);
    }
  }, [pathname, plan, history]);

  const sites: SiteRowSchema[] = React.useMemo(() => {
    const checkedSites = pendingTopology.sites;
    return !isEmpty(filteredTopology?.sites)
      ? objectValuesTypesafe(filteredTopology.sites).map(site => {
          return {
            id: site.site_id,
            name: site.name,
            latitude: site?.loc.latitude,
            longitude: site?.loc.longitude,
            site_type: ANP_SITE_TYPE_PRETTY[site?.site_type],
            status_type: ANP_STATUS_TYPE_PRETTY[site?.status_type],
            // No documentation for tableData :( but here's something:
            // https://github.com/mbrn/material-table/issues/2180
            tableData: {checked: checkedSites.has(site.site_id)},
          };
        })
      : [];
  }, [filteredTopology, pendingTopology]);

  const links: LinkRowSchema[] = React.useMemo(() => {
    const checkedLinks = pendingTopology.links;
    return !isEmpty(filteredTopology?.links)
      ? objectValuesTypesafe(filteredTopology.links).map(link => {
          return {
            id: link.link_id,
            name: createLinkName(link, filteredTopology.sites),
            mcs: link?.MCS,
            snr: link?.SNR,
            capacity: link?.capacity,
            length: link?.distance,
            tableData: {checked: checkedLinks.has(link.link_id)},
          };
        })
      : [];
  }, [filteredTopology, pendingTopology]);

  const siteRowClick = React.useCallback(
    (_, row: SiteRowSchema) => {
      if (pendingTopology.sites.has(row.id)) {
        removeFromPendingTopology([row.id], 'sites');
      } else {
        appendPendingTopology([row.id], 'sites');
      }
    },
    [pendingTopology, appendPendingTopology, removeFromPendingTopology],
  );
  const sitesSelectionCallback = React.useCallback(
    (rows: SiteRowSchema[]) => {
      setPendingTopology({sites: rows.map(e => e.id)});
    },
    [setPendingTopology],
  );

  const linkRowClick = React.useCallback(
    (_, row: LinkRowSchema) => {
      if (pendingTopology.links.has(row.id)) {
        removeFromPendingTopology([row.id], 'links');
      } else {
        appendPendingTopology([row.id], 'links');
      }
    },
    [pendingTopology, appendPendingTopology, removeFromPendingTopology],
  );
  const linksSelectionCallback = React.useCallback(
    (rows: LinkRowSchema[]) => {
      setPendingTopology({links: rows.map(e => e.id)});
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
          <BackButton
            from={PLANNING_PLAN_PATH}
            to={PLANNING_FOLDER_PATH}
            label="Back to Plans"
            data-testid="back-to-plans"
          />
        </Grid>
      </Grid>
      <Accordion className={classes.accordion}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="sites-panel-content"
          id="sites-panel-header"
          classes={{
            root: classes.summaryRoot,
            content: classes.summaryContent,
          }}>
          <Typography>Sites</Typography>
        </AccordionSummary>

        <AccordionDetails className={classes.details}>
          <MaterialTable
            style={tableStyle}
            title={''}
            data={sites}
            columns={SITE_COLUMNS}
            options={tableOptions}
            onRowClick={siteRowClick}
            onSelectionChange={sitesSelectionCallback}
          />
        </AccordionDetails>
      </Accordion>
      <Accordion className={classes.accordion}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="links-panel-content"
          id="links-panel-header"
          classes={{
            root: classes.summaryRoot,
            content: classes.summaryContent,
          }}>
          <Typography>Links</Typography>
        </AccordionSummary>
        <AccordionDetails className={classes.details}>
          <MaterialTable
            style={tableStyle}
            title={''}
            data={links}
            columns={LINK_COLUMNS}
            options={tableOptions}
            onRowClick={linkRowClick}
            onSelectionChange={linksSelectionCallback}
          />
        </AccordionDetails>
      </Accordion>
    </>
  );
}
