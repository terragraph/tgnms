/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import EventsView from './EventsView';
import Grid from '@material-ui/core/Grid';
import LinkGraphs from './LinkGraphs';
import NetworkGraphs from './NetworkGraphs';
import NodeGraphs from './NodeGraphs';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import axios from 'axios';
import {EVENT_TYPES} from './EventsView';
import {
  MILLISECONDS_TO_MINUTES,
  STEP_SIZE,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {TIME_DIFFERENCE_IN_MINUTES} from './RootCause';
import {
  createQuery,
  queryDataArray,
} from '@fbcnms/tg-nms/app/apiutils/PrometheusAPIUtil';
import {getDefaultRouteHistory} from '@fbcnms/tg-nms/app/apiutils/DefaultRouteHistoryAPIUtil';
import {getUIEnvVal} from '../../common/uiConfig';
import {makeStyles} from '@material-ui/styles';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

const TIMELINE_START_PERCENT = 8;
const TIMELINE_WIDTH_PERCENT = 78;

const ROUTE_GREY = '#8C8C8C';
const CONFIG_BLUE = '#80aaff';
const TOPOLOGY_ORANGE = '#f28046';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  eventsWrapper: {
    zIndex: 90,
    height: theme.spacing(11),
    width: `calc(100vw - ${theme.spacing(56.75)}px)`,
    position: 'absolute',
    margin: -theme.spacing(2),
    padding: theme.spacing(2),
  },
  graphSpacing: {marginTop: theme.spacing(7)},
}));

export default function CorrelationVisualization({
  selectedNodeName,
  timeOffset,
}: {
  selectedNodeName: ?string,
  timeOffset: string,
}) {
  const classes = useStyles();
  const {nodeToLinksMap, networkName} = useNetworkContext();
  const [data, setData] = React.useState(null);
  const [defaultRouteHistory, setDefaultRouteHistory] = React.useState([]);
  const [events, setEvents] = React.useState([]);
  const [showConfigEvent, setShowConfigEvent] = React.useState(true);
  const [showRouteEvent, setShowRouteEvent] = React.useState(true);
  const [showTopologyEvent, setShowTopologyEvent] = React.useState(true);
  const [elasticSearchData, setElasticSearchData] = React.useState(null);
  const nodeCorrelation = selectedNodeName != null;
  const elasticBaseUrlRef = React.useRef(getUIEnvVal('ELASTIC_URL'));

  const startTime = React.useMemo(
    () =>
      new Date().getTime() -
      TIME_DIFFERENCE_IN_MINUTES[timeOffset] * MILLISECONDS_TO_MINUTES,
    [timeOffset],
  );
  const endTime = React.useMemo(() => new Date().getTime(), []);
  const links = [...(nodeToLinksMap[selectedNodeName ?? ''] ?? [])];

  React.useEffect(() => {
    async function fetchPromData() {
      const metrics = [
        'snr',
        'topology_link_is_online',
        'topology_node_is_online',
        'udp_pinger_loss_ratio',
        'topology_online_wireless_links_ratio',
      ];
      const queries = metrics.map(metric =>
        createQuery(metric, {
          network: networkName,
        }),
      );
      try {
        const response = await queryDataArray(
          queries,
          timeToSeconds(startTime),
          timeToSeconds(endTime),
          STEP_SIZE,
          networkName,
        );
        setData(response.data);
      } catch (err) {
        console.error(err.message);
      }
    }
    fetchPromData();
  }, [endTime, networkName, startTime]);

  React.useEffect(() => {
    async function fetchElasticData() {
      const elasticUrl = `${elasticBaseUrlRef.current}/fluentd-log-server*/_search?size=1000`;
      try {
        const response = await axios.get(elasticUrl);
        setElasticSearchData(response.data?.hits?.hits);
      } catch (err) {
        console.error(err.message);
      }
    }
    fetchElasticData();
  }, []);

  const processDefaultRoutes = React.useCallback(async () => {
    if (selectedNodeName == null) {
      return;
    }
    const defaultRoutes = await getDefaultRouteHistory({
      networkName,
      nodeName: selectedNodeName,
      startTime: new Date(startTime).toISOString().split('.')[0],
      endTime: new Date(endTime).toISOString().split('.')[0],
    });

    setDefaultRouteHistory(defaultRoutes?.history ?? []);
  }, [selectedNodeName, startTime, endTime, networkName]);

  React.useEffect(() => {
    processDefaultRoutes();
  }, [processDefaultRoutes]);

  React.useEffect(() => {
    const newEvents = [];

    // add config and topology events
    elasticSearchData?.forEach(log => {
      const apiPath = log._source.path;
      const apiData = log._source.body;
      const logTimeStamp = log._source['@timestamp'] * 1000;
      const timelinePercent =
        TIMELINE_START_PERCENT +
        (1 -
          (endTime - new Date(logTimeStamp).getTime()) /
            (endTime - startTime)) *
          TIMELINE_WIDTH_PERCENT;

      if (new Date(logTimeStamp).getTime() < startTime) {
        return;
      }

      if (nodeCorrelation) {
        if (
          apiPath.includes(EVENT_TYPES.NODE_CONFIG_CHANGE) &&
          selectedNodeName != null &&
          apiData.includes(selectedNodeName)
        ) {
          newEvents.push({
            id: log._id,
            timeStamp: logTimeStamp,
            type: EVENT_TYPES.NODE_CONFIG_CHANGE,
            color: CONFIG_BLUE,
            timelinePercent,
            visible: showConfigEvent,
          });
        }
      } else {
        if (apiPath.includes(EVENT_TYPES.NETWORK_CONFIG_CHANGE)) {
          newEvents.push({
            id: log._id,
            timeStamp: logTimeStamp,
            type: EVENT_TYPES.NETWORK_CONFIG_CHANGE,
            color: CONFIG_BLUE,
            timelinePercent,
            visible: showConfigEvent,
          });

          // add topology events
        } else if (apiPath.includes(EVENT_TYPES.DELETE_LINK)) {
          newEvents.push({
            id: log._id,
            timeStamp: logTimeStamp,
            type: EVENT_TYPES.DELETE_LINK,
            color: TOPOLOGY_ORANGE,
            timelinePercent,
            visible: showTopologyEvent,
          });
        } else if (apiPath.includes(EVENT_TYPES.ADD_LINK)) {
          newEvents.push({
            id: log._id,
            timeStamp: logTimeStamp,
            type: EVENT_TYPES.ADD_LINK,
            color: TOPOLOGY_ORANGE,
            timelinePercent,
            visible: showTopologyEvent,
          });
        } else if (apiPath.includes(EVENT_TYPES.BULK_ADD)) {
          newEvents.push({
            id: log._id,
            timeStamp: logTimeStamp,
            type: EVENT_TYPES.BULK_ADD,
            color: TOPOLOGY_ORANGE,
            timelinePercent,
            visible: showTopologyEvent,
          });
        } else if (apiPath.includes(EVENT_TYPES.ADD_NODE)) {
          newEvents.push({
            id: log._id,
            timeStamp: logTimeStamp,
            type: EVENT_TYPES.ADD_NODE,
            color: TOPOLOGY_ORANGE,
            timelinePercent,
            visible: showTopologyEvent,
          });
        }
      }
    });

    // add route events
    if (defaultRouteHistory !== null && nodeCorrelation) {
      defaultRouteHistory?.forEach(defaultRoute => {
        const time = new Date(defaultRoute.last_updated);
        time.setMinutes(time.getMinutes() - time.getTimezoneOffset());
        const timeStamp = time.toLocaleString();

        if (time.getTime() < startTime) {
          return;
        }

        newEvents.push({
          id: defaultRoute.last_updated,
          timeStamp,
          type: EVENT_TYPES.DEFAULT_ROUTE_CHANGE,
          color: ROUTE_GREY,
          timelinePercent:
            TIMELINE_START_PERCENT +
            (1 -
              (endTime - new Date(timeStamp).getTime()) /
                (endTime - startTime)) *
              TIMELINE_WIDTH_PERCENT,
          visible: showRouteEvent,
        });
      });
    }
    setEvents(newEvents);
  }, [
    elasticSearchData,
    defaultRouteHistory,
    selectedNodeName,
    startTime,
    endTime,
    nodeCorrelation,
    showConfigEvent,
    showRouteEvent,
    showTopologyEvent,
  ]);

  const eventGroups = React.useMemo(
    () => [
      {
        title: 'Config Changes',
        color: CONFIG_BLUE,
        checked: showConfigEvent,
        handleChange: setShowConfigEvent,
      },
      nodeCorrelation
        ? {
            title: 'Route Changes',
            color: ROUTE_GREY,
            checked: showRouteEvent,
            handleChange: setShowRouteEvent,
          }
        : {
            title: 'Topology Changes',
            color: TOPOLOGY_ORANGE,
            checked: showTopologyEvent,
            handleChange: setShowTopologyEvent,
          },
    ],
    [nodeCorrelation, showConfigEvent, showRouteEvent, showTopologyEvent],
  );
  return (
    <Grid container spacing={6} direction="column" className={classes.root}>
      <Grid item xs={12}>
        <Paper square elevation={0} className={classes.eventsWrapper}>
          <EventsView
            events={events}
            eventGroups={eventGroups}
            startTime={startTime}
          />
        </Paper>
      </Grid>
      <Grid item xs={12} className={classes.graphSpacing}>
        {nodeCorrelation ? (
          <>
            <NodeGraphs
              nodeName={selectedNodeName}
              startTime={startTime}
              endTime={endTime}
              data={data}
            />
            {links.map(linkName => (
              <LinkGraphs
                linkName={linkName}
                data={data}
                startTime={startTime}
                endTime={endTime}
              />
            ))}
          </>
        ) : (
          <NetworkGraphs startTime={startTime} endTime={endTime} data={data} />
        )}
      </Grid>
    </Grid>
  );
}

function timeToSeconds(time) {
  return Math.round(time / 1000);
}
