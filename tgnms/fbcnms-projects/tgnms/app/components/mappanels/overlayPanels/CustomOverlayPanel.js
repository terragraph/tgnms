/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as mapApiUtil from '@fbcnms/tg-nms/app/apiutils/MapAPIUtil';
import Alert from '@material-ui/lab/Alert';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import useInterval from '@fbcnms/ui/hooks/useInterval';
import useMapProfile, {
  useShowCustomOverlayPanel,
} from '@fbcnms/tg-nms/app/views/map/useMapProfile';
import useTaskState, {TASK_STATE} from '../../../hooks/useTaskState';
import {MAPMODE, useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {RESPONSE_TYPE} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';
import {makeStyles} from '@material-ui/styles';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

import type {
  Legend,
  LinkMetrics,
  RemoteOverlay,
  TopologyOverlayResponse,
} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';
import type {
  Overlay,
  OverlayConfig,
  OverlaysConfig,
} from '@fbcnms/tg-nms/app/views/map/NetworkMapTypes';

// Interval at which link overlay metrics are refreshed (in ms)
const LINK_OVERLAY_METRIC_REFRESH_INTERVAL_MS = 10000;

const useStyles = makeStyles(theme => ({
  root: {
    marginBottom: theme.spacing(2),
  },
  loadingIndicator: {
    marginLeft: theme.spacing(1),
    marginTop: -4,
  },
}));

const OVERLAY_ID = 'custom';

export default function CustomOverlayPanel() {
  const classes = useStyles();
  const {
    mapMode,
    setOverlaysConfig,
    setOverlayData,
    setSelectedOverlays,
  } = useMapContext();
  const {networkName} = useNetworkContext();
  const [lastRefreshDate, setLastRefreshDate] = React.useState(new Date());
  const mapProfile = useMapProfile();
  const [selectedCustomOverlay, setSelectedCustomOverlay] = React.useState('');
  const {isLoading, isError, message, setMessage, setState} = useTaskState();

  const setOverlaysConfigRef = React.useRef(setOverlaysConfig);
  setOverlaysConfigRef.current = setOverlaysConfig;

  useInterval(() => {
    setLastRefreshDate(new Date());
  }, LINK_OVERLAY_METRIC_REFRESH_INTERVAL_MS);
  useExitCustomOverlayMode();

  const overlays: Array<Overlay> = React.useMemo(() => {
    const overlayDef: Array<Overlay> = (
      mapProfile.data?.remoteOverlays ?? []
    ).map(o => ({
      name: o.name,
      id: o.id,
      type: 'custom',
    }));
    return overlayDef;
  }, [mapProfile]);

  React.useEffect(() => {
    if (overlays && overlays.length > 0) {
      setSelectedCustomOverlay(overlays[0].id);
      const overlaysDef = [
        {
          name: OVERLAY_ID,
          id: OVERLAY_ID,
          type: 'custom',
        },
      ];
      /**
       * Set all overlay configs to have one overlay. This hides the overlay
       * selection dropdowns, but they'll keep rendering.
       */
      setOverlaysConfigRef.current({
        link_lines: {
          layerId: 'link_lines',
          overlays: overlaysDef,
          legend: {},
          defaultOverlayId: OVERLAY_ID,
        },
        site_icons: {
          layerId: 'site_icons',
          overlays: overlaysDef,
          legend: {},
          defaultOverlayId: OVERLAY_ID,
        },
        nodes: {
          layerId: 'nodes',
          overlays: overlaysDef,
          defaultOverlayId: OVERLAY_ID,
          legend: {},
        },
      });
      setSelectedOverlays({
        link_lines: OVERLAY_ID,
        site_icons: OVERLAY_ID,
      });
    }
  }, [
    networkName,
    mapProfile,
    mapMode,
    setOverlayData,
    setSelectedOverlays,
    setOverlaysConfigRef,
    overlays,
  ]);

  React.useEffect(() => {
    async function fetchCustomOverlayData() {
      try {
        setState(TASK_STATE.LOADING);
        const selectedOverlay = mapProfile.data?.remoteOverlays?.find(
          x => x.id === selectedCustomOverlay,
        );
        if (!selectedOverlay) {
          setState(TASK_STATE.IDLE);
          return;
        }
        const response = await mapApiUtil.queryRemoteOverlay({
          networkName: networkName,
          overlay: selectedOverlay,
        });
        if (response == null || response.type === RESPONSE_TYPE.error) {
          setState(TASK_STATE.ERROR);
          return setMessage(
            response?.error?.message ?? 'Remote API returned an error',
          );
        }

        if (response.legend) {
          const overlayConfig = makeDynamicOverlaysConfig(
            selectedOverlay,
            response,
          );
          setOverlaysConfigRef.current(overlayConfig);
        }
        if (response.type === 'topology') {
          const linkData = linksToOverlayData(response?.data?.links ?? {});
          setOverlayData({
            link_lines: linkData,
          });
        }
        setState(TASK_STATE.SUCCESS);
      } catch (err) {
        console.error(err);
        setState(TASK_STATE.ERROR);
        setMessage(err.message);
      }
    }
    fetchCustomOverlayData();
  }, [
    networkName,
    selectedCustomOverlay,
    setOverlaysConfigRef,
    setOverlayData,
    lastRefreshDate,
    setState,
    setMessage,
    mapProfile.data,
  ]);

  return (
    <Grid
      container
      className={classes.root}
      data-testid="custom-overlay-panel"
      spacing={2}>
      {isError && (
        <Grid item xs={12}>
          <Alert severity="error" color="error" data-testid="overlay-error">
            {message}
          </Alert>
        </Grid>
      )}
      <Grid item xs={12}>
        <FormGroup row={false}>
          <FormLabel component="legend">
            <span>Custom Overlay</span>
            {isLoading && (
              <CircularProgress
                className={classes.loadingIndicator}
                size={16}
              />
            )}
          </FormLabel>
          <Select
            value={selectedCustomOverlay}
            onChange={e => setSelectedCustomOverlay(e.target.value)}>
            {overlays.map(overlay => {
              return (
                <MenuItem key={overlay.id} value={overlay.id}>
                  {overlay.name}
                </MenuItem>
              );
            })}
          </Select>
        </FormGroup>
      </Grid>
    </Grid>
  );
}

function linksToOverlayData(
  linkMetrics: LinkMetrics,
): {[string]: {A: number, Z: number}} {
  return Object.keys(linkMetrics).reduce((map, key) => {
    const metric = linkMetrics[key];
    map[key] = {
      A: {
        [OVERLAY_ID]: metric?.A?.value,
      },
      Z: {
        [OVERLAY_ID]: metric?.Z?.value,
      },
    };
    return map;
  }, {});
}

function makeDynamicOverlaysConfig(
  def: RemoteOverlay,
  response: TopologyOverlayResponse,
): OverlaysConfig {
  const linksLegend = mapLegendToOverlayConfig(response?.legend?.links);
  const formatLinkText = (link, value, valIdx) => {
    if (value == null) {
      return '';
    }
    // determine which value (A or Z) is being rendered
    const linkDir = indexToDirection(valIdx);
    const linkMetric = response?.data?.links[link.name];
    if (!linkMetric) {
      return '';
    }
    const metric = linkMetric[linkDir];
    if (metric?.text != null) {
      return metric?.text;
    }
    return value;
  };
  return {
    link_lines: {
      layerId: 'link_lines',
      overlays: [
        {
          name: 'custom',
          id: 'custom',
          type: 'metric',
          range: linksLegend.range,
          colorRange: linksLegend.colorRange,
          formatText: formatLinkText,
        },
      ],
      legend: {
        metric: linksLegend.legendConfig,
      },
      defaultOverlayId: 'custom',
    },
    site_icons: makeOverlayConfig('site_icons', response?.legend?.sites),
    nodes: makeOverlayConfig('nodes', response?.legend?.nodes),
  };
}

/**
 * Maps from the more friendly Legend format to an intermediate format
 * closer to how OverlayConfig works
 */
function mapLegendToOverlayConfig(
  legend: Legend,
): {
  colorRange: Array<string>,
  range: Array<number>,
  legendConfig: {[string]: {color: string}},
} {
  const range = [];
  const colorRange = [];
  const legendConfig = {};
  for (const l of legend?.items ?? []) {
    range.push(l.value);
    colorRange.push(l.color);
    legendConfig[l.label] = l;
  }
  return {range, colorRange, legendConfig};
}

// DEPRECATE
function makeOverlayConfig(layerId: string, legend: Legend): OverlayConfig {
  const range = [];
  const colorRange = [];
  const legendMapping = {};
  for (const l of legend?.items ?? []) {
    range.push(l.value);
    colorRange.push(l.color);
    legendMapping[l.label] = l;
  }

  const overlayId = 'custom';
  const formatText = (element, value) => {
    if (value == null) {
      return '';
    }
    return value;
  };
  const overlay: OverlayConfig = {
    layerId,
    overlays: [
      {
        name: overlayId,
        id: overlayId,
        type: 'metric',
        range,
        colorRange,
        formatText,
      },
    ],
    legend: {
      metric: legendMapping,
    },
    defaultOverlayId: overlayId,
  };
  return overlay;
}

function indexToDirection(idx: number): 'A' | 'Z' {
  if (idx === 0) {
    return 'A';
  }
  if (idx === 1) {
    return 'Z';
  }
  throw new Error('Cannot convert index to direction ' + idx);
}

function useExitCustomOverlayMode() {
  const {setMapMode} = useMapContext();
  const {networkName} = useNetworkContext();
  const showCustomOverlayPanel = useShowCustomOverlayPanel();

  React.useEffect(() => {
    if (!showCustomOverlayPanel) {
      setMapMode(MAPMODE.DEFAULT);
    }
  }, [networkName, showCustomOverlayPanel, setMapMode]);
}
