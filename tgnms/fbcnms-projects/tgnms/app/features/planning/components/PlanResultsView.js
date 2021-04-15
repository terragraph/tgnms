/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import * as turf from '@turf/turf';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import MapIcon from '@material-ui/icons/Map';
import PlanErrors from './PlanErrors';
import PlanInputs from './PlanInputs';
import PlanOutputs from './PlanOutputs';
import PlanStatus from './PlanStatus';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {ANP_SITE_TYPE} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import {ANP_STATUS_TYPE} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import {OUTPUT_FILENAME, PLAN_STATUS} from '@fbcnms/tg-nms/shared/dto/ANP';
import {SITE_FEATURE_TYPE} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';
import {locToPos} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {makeLinkName} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {makeStyles} from '@material-ui/styles';
import {
  objectEntriesTypesafe,
  objectValuesTypesafe,
} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import type {ANPPlan, AnpFileHandle} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {
  AnpLink,
  AnpSector,
  AnpSite,
  AnpUploadTopologyType,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import type {InputFilesByRole} from './PlanEditor';
import type {
  LinkFeature,
  MapFeatureTopology,
  NodeFeature,
  SiteFeature,
} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';

const DEFAULT_MAP_OPTIONS_STATE = {
  enabledStatusTypes: {
    PROPOSED: true,
    UNAVAILABLE: true,
  },
};
type EnabledStatusTypes = {|[$Keys<typeof ANP_STATUS_TYPE>]: boolean|};
type MapOptionsState = {|
  enabledStatusTypes: EnabledStatusTypes,
|};

export default function PlanResultsView({
  plan,
  inputFiles,
}: {
  plan: ?ANPPlan,
  inputFiles: ?InputFilesByRole,
}) {
  const {
    state: loadOutputsTaskState,
    setState: setLoadOutputsTaskState,
  } = useTaskState();
  const {
    state: downloadOutputState,
    setState: setDownloadOutputState,
  } = useTaskState();
  const {planTopology, setPlanTopology} = useNetworkPlanningContext();
  const {
    mapFeatures,
    setMapFeatures,
    mapboxRef,
    setOverlayData,
  } = useMapContext();
  const [outputFiles, setOutputFiles] = React.useState<?Array<AnpFileHandle>>(
    null,
  );
  const [mapOptions, setMapOptions] = React.useState<MapOptionsState>(
    DEFAULT_MAP_OPTIONS_STATE,
  );

  const [shouldZoomToBBox, setShouldZoomToBBox] = React.useState(false);
  // first, download the plan's output files
  React.useEffect(() => {
    (async () => {
      try {
        if (!plan) {
          return;
        }
        setLoadOutputsTaskState(TASK_STATE.LOADING);
        const outputFiles = await networkPlanningAPIUtil.getPlanOutputFiles({
          id: plan.id,
        });
        setOutputFiles(outputFiles);
        setLoadOutputsTaskState(TASK_STATE.SUCCESS);
      } catch (err) {
        setLoadOutputsTaskState(TASK_STATE.ERROR);
      }
    })();
  }, [plan, setLoadOutputsTaskState, setOutputFiles]);

  const reportingGraph = React.useMemo<?AnpFileHandle>(
    () =>
      outputFiles?.find(
        f => f.file_name === OUTPUT_FILENAME.REPORTING_GRAPH_JSON,
      ),
    [outputFiles],
  );
  // download the plan's reporting graph json and set planTopology
  React.useEffect(() => {
    (async () => {
      try {
        if (reportingGraph) {
          setDownloadOutputState(TASK_STATE.LOADING);
          const fileData = await networkPlanningAPIUtil.downloadFile({
            id: reportingGraph.id,
          });
          let fileDataStr = fileData.toString();
          // Workaround for T84339647
          fileDataStr = fileDataStr.replace(/\\n/g, '').slice(2, -1);

          const json = JSON.parse(fileDataStr);
          setPlanTopology(json);
          setShouldZoomToBBox(true);
          setDownloadOutputState(TASK_STATE.SUCCESS);
        }
      } catch (err) {
        console.error(err.message);
        setDownloadOutputState(TASK_STATE.ERROR);
      }
    })();
  }, [reportingGraph, setDownloadOutputState, setOverlayData, setPlanTopology]);

  // filter planTopology and convert into mapFeatures to be rendered
  React.useEffect(() => {
    if (planTopology != null) {
      const features = planToMapFeatures(
        planTopology,
        mapOptions.enabledStatusTypes,
      );

      /**
       * reindex links using tg's link naming scheme instead of
       * anp's unique linkid. overlayData depends on this
       */
      const linkLines = objectValuesTypesafe(planTopology.links).reduce(
        (map, link) => {
          const linkName = makeLinkName(link.rx_sector_id, link.tx_sector_id);
          map[linkName] = link;
          return map;
        },
        {},
      );
      setOverlayData({
        link_lines: linkLines,
        site_icons: planTopology.sites,
        nodes: planTopology.sectors,
      });
      setMapFeatures(features);
    }
  }, [planTopology, mapOptions, setMapFeatures, setOverlayData]);

  /**
   * only zoom to the plan's bbox once, after the plan has been
   * converted into map features.
   */
  React.useEffect(() => {
    if (shouldZoomToBBox && mapFeatures != null) {
      const bbox = getBBox(objectValuesTypesafe(mapFeatures.sites));
      if (bbox) {
        mapboxRef?.fitBounds(bbox);
        setShouldZoomToBBox(false);
      }
    }
  }, [shouldZoomToBBox, mapFeatures, mapboxRef]);

  if (!(plan && inputFiles)) {
    return null;
  }
  return (
    <Grid container direction="column" spacing={2} wrap="nowrap">
      <Grid item container justify="space-between" alignItems="center">
        <Typography color="textSecondary" variant="h6">
          {plan.plan_name}
        </Typography>
        <PlanStatus status={plan.plan_status} />
      </Grid>
      {plan.plan_status === PLAN_STATUS.FAILED && <PlanErrors plan={plan} />}
      <PlanMapOptions options={mapOptions} onChange={setMapOptions} />
      <Grid item>
        <Typography color="textSecondary">Input Files</Typography>
      </Grid>
      <PlanInputs files={inputFiles} />
      <Grid item>
        <Typography color="textSecondary">Output Files</Typography>
        {plan.plan_status === PLAN_STATUS.RUNNING && (
          <Typography variant="subtitle2" color="textSecondary">
            Plan in-progress
          </Typography>
        )}
      </Grid>
      {(downloadOutputState === TASK_STATE.LOADING ||
        loadOutputsTaskState === TASK_STATE.LOADING) && (
        <Grid item>
          <Grid container justify="center">
            <CircularProgress size={10} />
          </Grid>
        </Grid>
      )}
      {outputFiles && <PlanOutputs files={outputFiles} />}
    </Grid>
  );
}

const useMapOptionsStyles = makeStyles(() => ({
  switchWrapper: {
    marginLeft: -6,
  },
}));

function PlanMapOptions({
  options,
  onChange,
}: {
  options: MapOptionsState,
  onChange: ((MapOptionsState => MapOptionsState) | MapOptionsState) => void,
}) {
  const {mapFeatures, mapboxRef} = useMapContext();
  const classes = useMapOptionsStyles();
  const handleOptionChange = React.useCallback(
    e => {
      const {name, checked} = e.target;
      onChange(curr => ({
        ...curr,
        enabledStatusTypes: {
          ...curr.enabledStatusTypes,
          [name]: checked,
        },
      }));
    },
    [onChange],
  );
  const handleFitPlanBounds = React.useCallback(() => {
    const bbox = getBBox(objectValuesTypesafe(mapFeatures.sites));
    if (bbox) {
      mapboxRef?.fitBounds(bbox);
    }
  }, [mapFeatures, mapboxRef]);
  return (
    <Grid item>
      <FormControl component="fieldset">
        <FormLabel component="legend">
          Map elements{' '}
          <IconButton
            size="small"
            title="Move map to plan"
            onClick={handleFitPlanBounds}>
            <MapIcon fontSize="small" />
          </IconButton>
        </FormLabel>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={options.enabledStatusTypes.PROPOSED}
                name="PROPOSED"
                onChange={handleOptionChange}
                size="small"
              />
            }
            label="Proposed topology"
            className={classes.switchWrapper}
          />
          <FormControlLabel
            control={
              <Switch
                checked={options.enabledStatusTypes.UNAVAILABLE}
                name="UNAVAILABLE"
                onChange={handleOptionChange}
                size="small"
              />
            }
            label="Unavailable topology"
            className={classes.switchWrapper}
          />
          <FormControlLabel
            control={
              <Switch
                checked={options.enabledStatusTypes.CANDIDATE}
                onChange={handleOptionChange}
                name="CANDIDATE"
                size="small"
              />
            }
            label="Candidate graph"
            className={classes.switchWrapper}
          />
        </FormGroup>
      </FormControl>
    </Grid>
  );
}

function planToMapFeatures(
  plan: AnpUploadTopologyType,
  enabledStatusTypes: EnabledStatusTypes,
): MapFeatureTopology {
  const links = {};
  /**
   * EnabledStatusTypes maps from status type key->boolean. Convert this to a
   * set of enabled status types
   */
  const lookup = new Set<number>();
  for (const [key, enabled] of objectEntriesTypesafe(enabledStatusTypes)) {
    if (enabled) {
      lookup.add(ANP_STATUS_TYPE[key]);
    }
  }
  if (plan.links != null) {
    for (const planLink of objectValuesTypesafe<AnpLink>(plan.links)) {
      if (!lookup.has(planLink.status_type)) {
        continue;
      }
      const link = mapAnpLinkToFeature(planLink);
      if (link != null) {
        links[link.name] = link;
      }
    }
  }
  const sites = {};
  if (plan.sites != null) {
    for (const planSite of objectValuesTypesafe<AnpSite>(plan.sites)) {
      if (!lookup.has(planSite.status_type)) {
        continue;
      }
      const site = mapAnpSiteToFeature(planSite);
      sites[site.name] = site;
    }
  }
  const nodes = {};
  if (plan.sectors != null) {
    for (const planNode of objectValuesTypesafe<AnpSector>(plan.sectors)) {
      if (!lookup.has(planNode.status_type)) {
        continue;
      }
      const node = mapAnpNodeToFeature(planNode);
      nodes[node.name] = node;
    }
  }
  return {
    links: links,
    sites: sites,
    nodes: nodes,
  };
}

function mapAnpLinkToFeature(link: AnpLink): ?LinkFeature {
  const {tx_sector_id: a, rx_sector_id: z, link_type} = link;
  if (a == null || z == null) {
    return null;
  }
  return {
    name: makeLinkName(a, z),
    a_node_name: a,
    z_node_name: z,
    link_type: link_type,
    properties: link,
  };
}

function mapAnpSiteToFeature(site: AnpSite): SiteFeature {
  const {site_id, loc, site_type} = site;
  // convert from ANP's SiteType mapping to the MapFeature mapping
  let siteFeatureType: number;
  switch (site_type) {
    case ANP_SITE_TYPE.CN:
      siteFeatureType = SITE_FEATURE_TYPE.CN;
      break;
    case ANP_SITE_TYPE.POP:
      siteFeatureType = SITE_FEATURE_TYPE.POP;
      break;
    default:
      siteFeatureType = SITE_FEATURE_TYPE.DN;
  }
  return {
    name: site_id,
    location: loc,
    properties: site,
    site_type: siteFeatureType,
  };
}
function mapAnpNodeToFeature(node: AnpSector): NodeFeature {
  const {sector_id, site_id, ant_azimuth} = node;
  return {
    name: sector_id,
    site_name: site_id,
    ant_azimuth: ant_azimuth,
    properties: node,
  };
}

function getBBox(sites: Array<SiteFeature>) {
  if (sites.length < 1) {
    return null;
  }
  const features = turf.featureCollection(
    sites.map(site => turf.point(locToPos(site.location))),
  );
  return turf.bbox(features);
}
