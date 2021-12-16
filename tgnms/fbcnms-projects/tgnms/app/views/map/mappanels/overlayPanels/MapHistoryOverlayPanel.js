/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import Box from '@material-ui/core/Box';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import NmsOptionsContext from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';
import React from 'react';
import Slider from 'rc-slider';
import Typography from '@material-ui/core/Typography';
import axios from 'axios';
import useUnmount from '@fbcnms/tg-nms/app/hooks/useUnmount';
import {
  HISTORICAL_LINK_METRIC_OVERLAYS,
  HISTORICAL_SITE_METRIC_OVERLAYS,
  INTERVAL_SEC,
  LINK_METRIC_OVERLAYS,
  LinkOverlayColors,
  MILLISECONDS_TO_MINUTES,
  MINUTES_IN_DAY,
  STEP_SIZE,
  SiteOverlayColors,
  TG_COLOR,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {KeyboardDatePicker} from '@material-ui/pickers';
import {MAPMODE, useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {
  addLabel,
  createQuery,
  queryDataArray,
} from '@fbcnms/tg-nms/app/apiutils/PrometheusAPIUtil';
import {cloneDeep, isEqual} from 'lodash';
import {
  deleteUrlSearchParam,
  getUrlSearchParam,
  setUrlSearchParam,
} from '@fbcnms/tg-nms/app/helpers/NetworkUrlHelpers';
import {getTopologyHistory} from '@fbcnms/tg-nms/app/apiutils/TopologyHistoryAPIUtil';
import {makeStyles} from '@material-ui/styles';
import {merge} from 'lodash';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useHistory, useLocation} from 'react-router-dom';
import type {Overlay} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';
import type {
  PrometheusDataType,
  PrometheusValue,
} from '@fbcnms/tg-nms/app/apiutils/PrometheusAPIUtil';

import type {TopologyHistoryResultsType} from '@fbcnms/tg-nms/shared/dto/TopologyHistoryTypes';

const LINK_OVERLAYS = {
  ...LINK_METRIC_OVERLAYS,
  ...HISTORICAL_LINK_METRIC_OVERLAYS,
};

const topologyPrometheusIDs = {
  link: 'topology_link_is_online',
  node: 'topology_node_is_online',
};

const linkOverlayList = objectValuesTypesafe(LINK_OVERLAYS).filter(
  overlay =>
    overlay.type === 'metric' ||
    overlay.type === 'topology' ||
    overlay.id === 'none',
);
const siteOverlayList = objectValuesTypesafe(HISTORICAL_SITE_METRIC_OVERLAYS);

const DATE_TO_STRING_PARAMS = [
  'en-US',
  {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  },
];

const TIME_OFFSET = new Date().getTimezoneOffset() * MILLISECONDS_TO_MINUTES;

const useStyles = makeStyles(theme => ({
  formContainer: {
    flexDirection: 'column',
  },
  sectionPadding: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  select: {
    marginBottom: theme.spacing(1),
  },
  loadingIndicator: {
    marginLeft: theme.spacing(1),
    marginTop: -4,
  },
  formGroup: {
    marginBottom: theme.spacing(2),
  },
  centered: {
    textAlign: 'center',
  },
}));

export default function MapHistoryOverlayPanel() {
  const classes = useStyles();
  const location = useLocation();
  const history = useHistory();
  const cancelSource = axios.CancelToken.source();
  const {networkName, siteToNodesMap} = React.useContext(NetworkContext);
  const {updateNetworkMapOptions, networkMapOptions} = React.useContext(
    NmsOptionsContext,
  );
  const {
    overlays,
    setOverlayData,
    setOverlaysConfig,
    setIsOverlayLoading,
  } = useMapContext();

  const [historicalStats, setHistoricalStats] = React.useState(
    networkMapOptions?.historicalData?.stats,
  );
  const [historicalTopology, setHistoricalTopology] = React.useState(
    networkMapOptions?.historicalData?.topology ?? [],
  );
  const [historicalTopologyIndex, setHistoricalTopologyIndex] = React.useState(
    0,
  );

  const [historicalDate, setHistoricalDate] = React.useState(
    networkMapOptions.historicalDate,
  );
  const [selectedTime, setSelectedTime] = React.useState<Date>(
    networkMapOptions.selectedTime,
  );
  const [errorMessage, setErrorMessage] = React.useState<?string>(null);
  // used to prevent refetching if restoring from nmsoptions
  const lastFetchedDateRef = React.useRef<?string>(
    networkMapOptions.historicalDate && historicalStats
      ? networkMapOptions.historicalDate.toISOString()
      : null,
  );
  const onSliderChange = React.useCallback(
    timeMinutes => {
      const newTime = new Date(
        historicalDate.getTime() + timeMinutes * MILLISECONDS_TO_MINUTES,
      );
      setSelectedTime(newTime);
    },
    [historicalDate],
  );

  const handleDateChange = React.useCallback(
    (newDate: string) => {
      if (newDate.toString() === 'Invalid Date') {
        return;
      }
      setHistoricalDate(new Date(newDate));
      onSliderChange(0);
    },
    [setHistoricalDate, onSliderChange],
  );

  // Fetch all data for the day
  React.useEffect(() => {
    async function fetchHistoricalData() {
      if (lastFetchedDateRef.current === historicalDate.toISOString()) {
        return;
      }
      lastFetchedDateRef.current = historicalDate.toISOString();
      setIsOverlayLoading(true);
      const overlays = [...linkOverlayList, ...siteOverlayList];
      const start = Math.round(historicalDate.getTime() / 1000);
      const end = Math.round(start + MINUTES_IN_DAY * 60);
      const prometheusIds = [
        ...overlays.reduce((final, overlay) => {
          if (overlay.id === 'none') {
            return final;
          }
          if (Array.isArray(overlay.metrics)) {
            overlay.metrics.forEach(metric => final.add(metric));
          } else {
            final.add(overlay.id);
          }
          return final;
        }, new Set()),
      ];
      const queries = prometheusIds.map(prometheusId => {
        if (Object.values(topologyPrometheusIDs).includes(prometheusId)) {
          return createQuery(prometheusId, {
            network: networkName,
          });
        }
        return createQuery(prometheusId, {
          network: networkName,
          intervalSec: INTERVAL_SEC,
        });
      });
      for (const overlay of overlays) {
        if (typeof overlay.query === 'function') {
          /**
           * Backend depends on the __name__ label to map each query
           * back to the overlay that requested it. Since this is a query and
           * not a single metric, add a fake name.
           */
          const query = addLabel(
            overlay.query({network: networkName}),
            '__name__',
            overlay.id,
          );
          queries.push(query);
        }
      }

      try {
        const [dataResponse, topologyResponse] = await Promise.all([
          queryDataArray(queries, start, end, STEP_SIZE, networkName),
          getTopologyHistory({
            inputData: {
              startTime: new Date(start * 1000).toISOString().split('Z')[0],
              endTime: new Date(end * 1000).toISOString().split('Z')[0],
              networkName,
            },
            cancelToken: cancelSource.token,
          }),
        ]);
        setHistoricalTopology(topologyResponse);
        setHistoricalStats(dataResponse.data);
      } catch (err) {
        setErrorMessage(err.message);
      } finally {
        setIsOverlayLoading(false);
      }
    }
    fetchHistoricalData();
  }, [
    networkName,
    historicalDate,
    setErrorMessage,
    setIsOverlayLoading,
    updateNetworkMapOptions,
    cancelSource,
  ]);

  React.useEffect(() => {
    const selectedTopology = historicalTopology.find((topology, index) => {
      if (!historicalTopology[index + 1]) {
        return;
      }
      const currentTopologyTime =
        new Date(topology.last_updated).getTime() - TIME_OFFSET;
      const nextTopologytime =
        new Date(historicalTopology[index + 1].last_updated).getTime() -
        TIME_OFFSET;

      const isCurrentTopology =
        currentTopologyTime < selectedTime.getTime() &&
        nextTopologytime > selectedTime.getTime();
      if (isCurrentTopology) {
        setHistoricalTopologyIndex(index);
      }
      return isCurrentTopology;
    });
    if (selectedTopology?.topology) {
      updateNetworkMapOptions({historicalTopology: selectedTopology.topology});
    }
  }, [historicalTopology, selectedTime, updateNetworkMapOptions]);

  // Filter and display the data for the selected time of day
  React.useEffect(() => {
    let linkOverlayData = {};
    let siteMapOverrides = {};
    const removedTopology = {};
    if (overlays.link_lines) {
      const overlay = overlays.link_lines;
      if (overlay.type === 'topology') {
        const {overlayData, removedLinks} = getTopologyLinkOverlay(
          historicalTopology,
          historicalTopologyIndex,
          overlay.id,
        );
        linkOverlayData = overlayData;
        removedTopology.links = removedLinks;
      } else {
        linkOverlayData = getHistoricalLinkOverlayMetrics(
          historicalStats,
          overlay,
          selectedTime,
        );
      }
    }
    if (overlays.site_icons) {
      const overlay = overlays.site_icons;
      if (overlay.type === 'topology') {
        const {overlayData, removedSites} = getTopologySiteOverlay(
          historicalTopology,
          historicalTopologyIndex,
        );
        siteMapOverrides = overlayData;
        removedTopology.sites = removedSites;
      } else {
        siteMapOverrides = getHistoricalSiteMap(
          historicalStats,
          siteToNodesMap,
          selectedTime,
        );
      }
    }
    if (historicalStats) {
      setOverlayData({
        link_lines: linkOverlayData,
        site_icons: siteMapOverrides,
      });
    }
    // if topology was removed it needs to be added to visualization
    if (
      Object.keys(removedTopology).length > 0 &&
      historicalTopology[historicalTopologyIndex]?.topology
    ) {
      const updatedHistoricalTopology = cloneDeep(
        historicalTopology[historicalTopologyIndex].topology,
      );
      updatedHistoricalTopology.sites.push(...(removedTopology?.sites ?? []));
      updatedHistoricalTopology.links.push(...(removedTopology?.links ?? []));
      updateNetworkMapOptions({
        historicalTopology: updatedHistoricalTopology,
      });
    }
  }, [
    historicalStats,
    selectedTime,
    overlays.link_lines,
    setOverlayData,
    siteToNodesMap,
    historicalTopology,
    historicalTopologyIndex,
    overlays,
    updateNetworkMapOptions,
  ]);

  React.useEffect(() => {
    if (getUrlSearchParam('mapMode', location) !== MAPMODE.HISTORICAL) {
      setUrlSearchParam(history, 'mapMode', MAPMODE.HISTORICAL);
    }

    setOverlaysConfig({
      link_lines: {
        layerId: 'link_lines',
        overlays: linkOverlayList,
        legend: LinkOverlayColors,
        defaultOverlayId: topologyPrometheusIDs.link,
      },
      site_icons: {
        layerId: 'site_icons',
        overlays: siteOverlayList,
        legend: SiteOverlayColors,
        defaultOverlayId: topologyPrometheusIDs.node,
      },
    });
    // only run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update the url whenever the historical date changes
  React.useEffect(() => {
    setUrlSearchParam(history, 'date', historicalDate.toISOString());
  }, [historicalDate, history]);

  useUnmount(() => {
    updateNetworkMapOptions({
      historicalDate: historicalDate,
      historicalTopology: {},
      selectedTime,
      historicalData: {
        stats: historicalStats,
        topology: historicalTopology,
      },
    });
    setOverlayData({});
    deleteUrlSearchParam(history, 'mapMode');
    deleteUrlSearchParam(history, 'date');
  });

  return (
    <Grid
      className={classes.formContainer}
      data-testid="map-history-overlay-panel"
      container
      direction="column"
      wrap="nowrap">
      <Grid item xs={12}>
        <Typography variant="subtitle2">Selected Date</Typography>
        <KeyboardDatePicker
          disableToolbar
          inputVariant="outlined"
          format="MM/DD/YYYY"
          margin="dense"
          id="date"
          value={historicalDate.toISOString().split('T')[0]}
          onChange={ev => handleDateChange(ev._d)}
          KeyboardButtonProps={{
            'aria-label': 'change date',
          }}
        />
      </Grid>
      <Grid item xs={12}>
        {errorMessage ? (
          <Typography data-testid="errorMessage" variant="subtitle1">
            Error getting data: {errorMessage}
          </Typography>
        ) : (
          <Box mt={1} mb={2} pl={1}>
            <FormLabel component="legend">
              <span>Current Value:</span>
            </FormLabel>
            <div>
              {selectedTime.toLocaleDateString(...DATE_TO_STRING_PARAMS)}
            </div>
            <Slider
              value={Math.round(
                (selectedTime.getTime() - historicalDate.getTime()) /
                  MILLISECONDS_TO_MINUTES,
              )}
              min={0}
              max={MINUTES_IN_DAY - 1}
              step={1}
              onChange={onSliderChange}
            />
          </Box>
        )}
      </Grid>
    </Grid>
  );
}

function getHistoricalLinkOverlayMetrics(
  historicalStats: ?{
    [string]: Array<PrometheusDataType>,
  },
  overlay: Overlay,
  selectedTime: Date,
) {
  let linkOverlayData = {};
  if (!overlay) {
    return linkOverlayData;
  }
  if (overlay.metrics) {
    linkOverlayData = overlay.metrics.reduce(
      (linkOverlayDataAggregator, metric) => {
        const metricData = formatHistoricalLinkOverlayData(
          historicalStats,
          metric,
          selectedTime,
        );
        if (metricData) {
          Object.keys(metricData).forEach(linkName => {
            if (linkOverlayDataAggregator[linkName] !== undefined) {
              linkOverlayDataAggregator[linkName]['A'][metric] =
                metricData[linkName]['A'][metric];
              linkOverlayDataAggregator[linkName]['Z'][metric] =
                metricData[linkName]['Z'][metric];
            } else {
              linkOverlayDataAggregator[linkName] = metricData[linkName];
            }
          });
        }
        return linkOverlayDataAggregator;
      },
      {},
    );
  }
  if (!overlay.metrics || overlay.query) {
    merge(
      linkOverlayData,
      formatHistoricalLinkOverlayData(
        historicalStats,
        overlay.id,
        selectedTime,
      ),
    );
  }
  return linkOverlayData;
}

function getHistoricalSiteMap(
  historicalStats: ?{
    [string]: Array<PrometheusDataType>,
  },
  siteToNodesMap: {[string]: Set<string>},
  selectedTime: Date,
) {
  const timeStamp = selectedTime.getTime() / 1000;

  return Object.keys(siteToNodesMap).reduce((final, siteName) => {
    const siteNodes = [...siteToNodesMap[siteName]];
    const nodeData = historicalStats?.[topologyPrometheusIDs.node];
    if (siteNodes.length === 0 || !nodeData) {
      final[siteName] = SiteOverlayColors.health.planned.color;
    } else {
      const siteAlive = new Set(
        siteNodes.map(nodeName =>
          findValuesByTimeStamp(
            nodeData.find(data => data.metric.nodeName === nodeName)?.values,
            timeStamp,
          ),
        ),
      );
      if (siteAlive.has('1') && !siteAlive.has('0') && !siteAlive.has(null)) {
        final[siteName] = SiteOverlayColors.health.healthy.color;
      } else if (
        siteAlive.has('1') &&
        (siteAlive.has('0') || siteAlive.has(null))
      ) {
        final[siteName] = SiteOverlayColors.health.partial.color;
      } else if (siteAlive.has('0')) {
        final[siteName] = SiteOverlayColors.health.unhealthy.color;
      } else {
        final[siteName] = SiteOverlayColors.health.planned.color;
      }
    }
    return final;
  }, {});
}

function formatHistoricalLinkOverlayData(
  historicalStats: ?{
    [string]: Array<PrometheusDataType>,
  },
  overlayId: string,
  selectedTime: Date,
) {
  const timeStamp = selectedTime.getTime() / 1000;

  if (!historicalStats || !historicalStats[overlayId]) {
    return {};
  }
  return historicalStats[overlayId].reduce((overlayData, data) => {
    const currentLinkName = data.metric.linkName || '';
    const currentLinkData = historicalStats[overlayId].filter(
      element => element.metric.linkName === currentLinkName,
    );
    if (currentLinkData.length === 2) {
      const [aDirection, zDirection] = currentLinkData;
      overlayData[currentLinkName] = {
        A: {
          [overlayId]: findValuesByTimeStamp(aDirection.values, timeStamp),
        },
        Z: {
          [overlayId]: findValuesByTimeStamp(zDirection.values, timeStamp),
        },
      };
    } else {
      const val = findValuesByTimeStamp(data.values, timeStamp);
      overlayData[currentLinkName] = {
        A: {[overlayId]: val},
        Z: {[overlayId]: val},
      };
    }
    return overlayData;
  }, {});
}

function findValuesByTimeStamp(data: ?PrometheusValue, timeStamp: number) {
  if (!data) {
    return null;
  }
  return data.reduce((final, [time, value]) => {
    if (time <= timeStamp) {
      final = value;
    }
    return final;
  }, undefined);
}

function getTopologyLinkOverlay(
  historicalTopology: Array<TopologyHistoryResultsType>,
  index: number,
  overalyId: string,
) {
  const currentLinks = historicalTopology[index]?.topology.links;
  const prevLinks = historicalTopology[index - 1]?.topology.links;
  const overlayData = {};
  currentLinks?.forEach(link => {
    const prevLink = prevLinks?.find(prevLink => prevLink.name === link.name);
    // if link name doesn't exist in previous list, this is new
    if (prevLinks && !prevLink) {
      overlayData[link.name] = {A: {[overalyId]: 0}, Z: {[overalyId]: 0}};
    }
    // link mac addresses or nodes changed this link is changed
    else if (prevLinks && !isEqual(prevLink, link)) {
      overlayData[link.name] = {A: {[overalyId]: 1}, Z: {[overalyId]: 1}};
    }
    // else link is the same
    else {
      overlayData[link.name] = {A: {[overalyId]: 3}, Z: {[overalyId]: 3}};
    }
  });

  // if link doesn't exist in cur list, but exists in prev list it is removed
  const removedLinks = prevLinks?.filter(
    prevLink => !currentLinks.find(link => link.name === prevLink.name),
  );
  removedLinks?.forEach(
    link =>
      (overlayData[link.name] = {A: {[overalyId]: 2}, Z: {[overalyId]: 2}}),
  );
  return {overlayData, removedLinks};
}

function getTopologySiteOverlay(
  historicalTopology: Array<TopologyHistoryResultsType>,
  index: number,
) {
  const currentSites = historicalTopology[index]?.topology.sites;
  const prevSites = historicalTopology[index - 1]?.topology.sites;
  const overlayData = {};
  currentSites?.forEach(site => {
    const prevSite = prevSites?.find(prevSite => prevSite.name === site.name);
    // site name doesn't exist in previous list, this is new
    if (prevSites && !prevSite) {
      overlayData[site.name] = TG_COLOR.GREEN;
    }
    // if site name exists but nodes are different site is changed
    else if (
      prevSites &&
      !isHistoricalSiteNodesEqual(
        historicalTopology,
        index,
        index - 1,
        site.name,
      )
    ) {
      overlayData[site.name] = TG_COLOR.ORANGE;
    }
    // else site is the same
    else {
      overlayData[site.name] = TG_COLOR.GREY;
    }
  });
  // if site doesn't exist in cur list, but exists in prev list it is removed
  const removedSites = prevSites?.filter(
    prevSite => !currentSites.find(site => site.name === prevSite.name),
  );
  removedSites?.forEach(site => (overlayData[site.name] = TG_COLOR.RED));
  return {overlayData, removedSites};
}

function isHistoricalSiteNodesEqual(
  historicalTopology: Array<TopologyHistoryResultsType>,
  index1: number,
  index2: number,
  siteName: string,
) {
  const nodes1 = historicalTopology[index1].topology.nodes.filter(
    node => node.site_name === siteName,
  );
  const nodes2 = historicalTopology[index2].topology.nodes.filter(
    node => node.site_name === siteName,
  );
  return isEqual(nodes1, nodes2);
}
