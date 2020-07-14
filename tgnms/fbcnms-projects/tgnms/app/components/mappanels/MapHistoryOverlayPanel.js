/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import FormLabel from '@material-ui/core/FormLabel';
import NetworkContext from '../../contexts/NetworkContext';
import NmsOptionsContext from '../../contexts/NmsOptionsContext';
import React from 'react';
import Slider from 'rc-slider';
import Typography from '@material-ui/core/Typography';
import useUnmount from '../../hooks/useUnmount';
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
} from '../../constants/LayerConstants';
import {KeyboardDatePicker} from '@material-ui/pickers';
import {MAPMODE, useMapContext} from '../../contexts/MapContext';
import {createQuery, queryDataArray} from '../../apiutils/PrometheusAPIUtil';
import {
  deleteUrlSearchParam,
  getUrlSearchParam,
  setUrlSearchParam,
} from '../../helpers/NetworkUrlHelpers';
import {makeStyles} from '@material-ui/styles';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';
import {useHistory, useLocation} from 'react-router-dom';
import type {Overlay} from '../../views/map/NetworkMapTypes';
import type {
  PrometheusDataType,
  PrometheusValue,
} from '../../apiutils/PrometheusAPIUtil';

const LINK_OVERLAYS = {
  ...LINK_METRIC_OVERLAYS,
  ...HISTORICAL_LINK_METRIC_OVERLAYS,
};

const linkOverlayList = objectValuesTypesafe(LINK_OVERLAYS).filter(
  overlay => overlay.type === 'metric',
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

const styles = theme => ({
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
});

type Props = {};

const useStyles = makeStyles(styles);
export default function MapHistoryOverlayPanel({}: Props) {
  const classes = useStyles();
  const location = useLocation();
  const history = useHistory();
  const {networkName, siteToNodesMap} = React.useContext(NetworkContext);
  const {updateNetworkMapOptions, networkMapOptions} = React.useContext(
    NmsOptionsContext,
  );
  const {
    overlays,
    setOverlayData,
    setOverlaysConfig,
    setSelectedOverlays,
    setIsOverlayLoading,
  } = useMapContext();
  const [historicalData, setHistoricalData] = React.useState(
    networkMapOptions.historicalData,
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
    networkMapOptions.historicalDate && networkMapOptions.historicalData
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

  React.useEffect(() => {
    setOverlaysConfig({
      link_lines: {
        layerId: 'link_lines',
        overlays: linkOverlayList,
        legend: LinkOverlayColors,
        defaultOverlayId: 'link_online',
      },
      site_icons: {
        layerId: 'site_icons',
        overlays: siteOverlayList,
        legend: SiteOverlayColors,
        defaultOverlayId: 'node_online',
      },
    });
  }, [setOverlaysConfig, setSelectedOverlays]);

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
          if (Array.isArray(overlay.metrics)) {
            overlay.metrics.forEach(metric => final.add(metric));
          }
          final.add(overlay.id);
          return final;
        }, new Set()),
      ];
      const queries = prometheusIds.map(prometheusId =>
        createQuery(prometheusId, {
          topologyName: networkName,
          intervalSec: INTERVAL_SEC,
        }),
      );

      try {
        const response = await queryDataArray(
          queries,
          start,
          end,
          STEP_SIZE,
          networkName,
        );
        setHistoricalData(response.data);
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
  ]);

  // Filter and display the data for the selected time of day
  React.useEffect(() => {
    if (overlays.link_lines) {
      const overlay = overlays.link_lines;
      const linkOverlayData = getHistoricalLinkOverlayMetrics(
        historicalData,
        overlay,
        selectedTime,
      );
      const siteMapOverrides = getHistoricalSiteMap(
        historicalData,
        siteToNodesMap,
        selectedTime,
      );
      if (historicalData) {
        setOverlayData({
          link_lines: linkOverlayData,
          site_icons: siteMapOverrides,
        });
      }
    }
  }, [
    historicalData,
    selectedTime,
    overlays.link_lines,
    setOverlayData,
    siteToNodesMap,
  ]);

  React.useEffect(() => {
    if (getUrlSearchParam('mapMode', location) !== MAPMODE.HISTORICAL) {
      setUrlSearchParam(history, 'mapMode', MAPMODE.HISTORICAL);
    }
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
      selectedTime,
      historicalData,
    });
    deleteUrlSearchParam(history, 'mapMode');
    deleteUrlSearchParam(history, 'date');
  });

  return (
    <div
      className={classes.formContainer}
      data-testid="map-history-overlay-panel">
      <div>
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
      </div>
      <div className={classes.sectionPadding} />
      {errorMessage ? (
        <Typography data-testid="errorMessage" variant="subtitle1">
          Error getting data: {errorMessage}
        </Typography>
      ) : (
        <>
          <FormLabel component="legend">
            <span>Current Value:</span>
          </FormLabel>
          <div>{selectedTime.toLocaleDateString(...DATE_TO_STRING_PARAMS)}</div>
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
        </>
      )}
    </div>
  );
}

function getHistoricalLinkOverlayMetrics(
  historicalData: ?{
    [string]: Array<PrometheusDataType>,
  },
  overlay: Overlay,
  selectedTime: Date,
) {
  let linkOverlayData;

  if (overlay && overlay.metrics) {
    linkOverlayData = overlay.metrics.reduce(
      (linkOverlayDataAggregator, metric) => {
        const metricData = formatHistoricalLinkOverlayData(
          historicalData,
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
  } else {
    linkOverlayData = formatHistoricalLinkOverlayData(
      historicalData,
      overlay.id,
      selectedTime,
    );
  }
  return linkOverlayData;
}

function getHistoricalSiteMap(
  historicalData: ?{
    [string]: Array<PrometheusDataType>,
  },
  siteToNodesMap: {[string]: Set<string>},
  selectedTime: Date,
) {
  const timeStamp = selectedTime.getTime() / 1000;

  return Object.keys(siteToNodesMap).reduce((final, siteName) => {
    const siteNodes = [...siteToNodesMap[siteName]];
    const nodeData = historicalData?.node_online;
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
  historicalData: ?{
    [string]: Array<PrometheusDataType>,
  },
  overlayId: string,
  selectedTime: Date,
) {
  const timeStamp = selectedTime.getTime() / 1000;

  if (!historicalData || !historicalData[overlayId]) {
    return {};
  }

  return historicalData[overlayId].reduce((overlayData, data) => {
    const currentLinkName = data.metric.linkName || '';
    const currentLinkData = historicalData[overlayId].filter(
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
    if (time === timeStamp) {
      final = value;
    }
    return final;
  }, undefined);
}
