/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import InfoIcon from '@material-ui/icons/Info';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import {
  ANP_SITE_TYPE_PRETTY,
  ANP_STATUS_TYPE_PRETTY,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants.js';
import {LINK_TYPE_PRETTY} from '@fbcnms/tg-nms/shared/topology/constants';
import {convertType} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {createLinkName} from '../PlanningHelpers';
import {get} from 'lodash';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {makeStyles} from '@material-ui/styles';
import {useNetworkPlanningManager} from '@fbcnms/tg-nms/app/features/planning/useNetworkPlanningManager';
import type {
  ANPLink,
  ANPSite,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants.js';

type PresentationOverride = {
  name?: string,
  tooltip?: string,
  transformValue?: (*) => any,
};

const status_type = {
  name: 'Status Type',
  transformValue: x => ANP_STATUS_TYPE_PRETTY[x],
};

const ANPLINK_FIELDS: {[string]: PresentationOverride} = {
  link_id: {name: 'Link ID'},
  link_hash: {name: 'Link Hash'},
  rx_sector_id: {name: 'RX Sector ID'},
  tx_sector_id: {name: 'TX Sector ID'},
  link_type: {name: 'Link Type', transformValue: x => LINK_TYPE_PRETTY[x]},
  tx_beam_azimuth: {name: 'TX Beam Azimuth'},
  rx_beam_azimuth: {name: 'RX Beam Azimuth'},
  distance: {name: 'Distance'},
  proposed_flow: {name: 'Proposed Flow'},
  tx_site_id: {name: 'TX Site ID'},
  rx_site_id: {name: 'RX Site ID'},
  status_type: status_type,
  capacity: {name: 'Capacity'},
  MCS: {},
  SNR: {},
  RSL: {},
  SINR: {},
  breakdowns: {name: 'Breakdowns'},
  times_on_mcs_route: {name: 'Times on MCS Route'},
  RSL_interference: {name: 'RSL Interference'},
};
const ANPSITE_FIELDS: {[string]: PresentationOverride} = {
  site_id: {name: 'Site ID'},
  'loc.latitude': {name: 'Latitude'},
  'loc.longitude': {name: 'Longitude'},
  'loc.altitude': {name: 'Altitude'},
  polarity: {name: 'Polarity'},
  site_type: {name: 'Site Type', transformValue: x => ANP_SITE_TYPE_PRETTY[x]},
  status_type: status_type,
  device_sku: {name: 'Device SKU'},
  site_capex: {name: 'Site Capex'},
  breakdowns: {name: 'Breakdowns'},
  active_sectors: {name: 'Active Sectors'},
  times_on_mcs_route: {name: 'Times on MCS Route'},
  hops: {name: 'Hops'},
  active_links: {name: 'Active Links'},
};

const useStyles = makeStyles(() => ({
  wrapAnywhere: {overflowWrap: 'anywhere'},
}));

export default function PlanSingleSelectionView() {
  const classes = useStyles();
  const {pendingTopology, filteredTopology} = useNetworkPlanningManager();
  let type;
  let fields;
  if (pendingTopology.links.size == 1) {
    type = 'links';
    fields = Object.keys(ANPLINK_FIELDS);
  } else if (pendingTopology.sites.size == 1) {
    type = 'sites';
    fields = Object.keys(ANPSITE_FIELDS);
  } else {
    return null;
  }

  const topologyElement =
    filteredTopology[type][Array.from(pendingTopology[type]).pop()];

  // Get metrics.
  let metrics = {};
  metrics = fields.reduce((result, key) => {
    const [name, value] = getMetricData(key, type, topologyElement);
    result[name] = value;
    return result;
  }, {});

  // Construct the name.
  let name;
  if (type == 'sites') {
    name = convertType<ANPSite>(topologyElement).name;
  } else {
    name = createLinkName(
      convertType<ANPLink>(topologyElement),
      filteredTopology.sites,
    );
  }

  return (
    <Grid container spacing={1}>
      <Grid item xs={12}>
        <Typography variant="h6" className={classes.wrapAnywhere}>
          {name}
        </Typography>
      </Grid>
      {Object.keys(metrics).length &&
        Object.keys(metrics).map(metric => (
          <Grid item xs={12} key={metric}>
            <PlanMetricItem name={metric} value={metrics[metric]} />
          </Grid>
        ))}
    </Grid>
  );
}

const usePlanMetricItemStyles = makeStyles(theme => ({
  infoIcon: {paddingTop: theme.spacing(0.5), color: '#e0dfdf'},
  metricName: {minWidth: 'fit-content'},
}));
type PlanMetricItemProps = {|
  name: string,
  value: {tooltip: string, value: string | number},
|};
function PlanMetricItem({name, value}: PlanMetricItemProps) {
  const classes = usePlanMetricItemStyles();
  return (
    <Grid item container xs={12} wrap="nowrap" justifyContent="space-between">
      <Grid
        item
        container
        className={classes.metricName}
        spacing={1}
        xs={4}
        alignItems="center">
        <Grid item>
          <Typography variant="body2">{name}</Typography>
        </Grid>

        {!isNullOrEmptyString(value.tooltip) && (
          <Grid item>
            <Tooltip title={value.tooltip} placement="top">
              <InfoIcon className={classes.infoIcon} fontSize="small" />
            </Tooltip>
          </Grid>
        )}
      </Grid>
      <Grid item container xs={8} justifyContent="flex-end" alignItems="center">
        <Typography variant="body2" noWrap>
          {value.value}
        </Typography>
      </Grid>
    </Grid>
  );
}

/**
 * Gets the presentation view data of the metrics.
 */
function getMetricData(key: string, type: 'sites' | 'links', item: any) {
  const value = get(item, key, null);
  const overrides = type == 'links' ? ANPLINK_FIELDS[key] : ANPSITE_FIELDS[key];
  return [
    overrides?.name ? overrides.name : key,
    {
      tooltip: overrides?.tooltip ? overrides.tooltip : null,
      value:
        overrides?.transformValue && value
          ? overrides.transformValue(value)
          : value,
    },
  ];
}
