/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {
  LINK_HEALTH_TIME_WINDOW_HOURS,
  LOGIN_ENABLED,
  PROMETHEUS_URL,
  STATS_ALLOWED_DELAY_SEC,
} = require('../config');
const EventSource = require('eventsource');
import apiServiceClient from '../apiservice/apiServiceClient';
import {approxDistance, computeAngle} from './helpers';
import {attrToMapProfile} from '../map/service';

const {
  getPeerAPIServiceHost,
  HAPeerType,
  determineActiveController,
} = require('../high_availability/model');
import {LinkStateType} from '../../thrift/gen-nodejs/Stats_types';

import {getLinkEvents, getNetworkList, updateOnlineWhitelist} from './network';
const _ = require('lodash');
const logger = require('../log')(module);
import axios from 'axios';
import moment from 'moment';

const networkLinkHealth = {};
const networkNodeHealth = {};
// hold the network configuration (primary/backup)
let networkInstanceConfig = {};

// TODO - these aren't in the new config yet
// hold all state
const networkState = {};
// backend service status - just Prometheus for now
const serviceState = {};

// This array and the two functions below keep tracks of topology
// stream event connections from browsers
let topologyEventRequesters = [];

function addRequester(name, res) {
  topologyEventRequesters.push({topologyName: name, response: res});
  // although we remove session when user disconnects, it is still a good idea
  // to protect in case the session ended, otherwise, it will crash the server
  res.on('error', e => {
    logger.error('Event stream write error for ' + name + '. Reason: ' + e);
  });
  return;
}

function removeRequester(response) {
  // session is gone, delete reference
  topologyEventRequesters = topologyEventRequesters.filter(item => {
    return item.response !== response;
  });
}

function getAllTopologyNames() {
  return Object.keys(networkInstanceConfig);
}

function getNetworkLinkHealth(topologyName) {
  return _.get(networkLinkHealth, topologyName);
}

function getNetworkNodeHealth(topologyName) {
  return _.get(networkNodeHealth, topologyName);
}

function getAllNetworkConfigs() {
  return networkInstanceConfig;
}

function getNetworkConfig(networkName) {
  if (networkInstanceConfig.hasOwnProperty(networkName)) {
    return networkInstanceConfig[networkName];
  }
  return null;
}

// DEPRECATED - use apiServiceClient.backgroundRequest directly instead
async function apiServiceRequest(
  networkName,
  isPrimaryController,
  host,
  port,
  apiMethod,
  data,
  config,
) {
  const result = await apiServiceClient.backgroundRequest({
    networkName,
    isPrimaryController,
    host,
    port,
    apiMethod,
    data,
    config,
  });
  return result;
}

// fetch list of networks
function reloadInstanceConfig() {
  logger.debug('Reloading instance config');
  const topologyConfig = {};
  return getNetworkList().then(topologyList => {
    topologyList.forEach(topologyItem => {
      const topologyName = topologyItem.name;
      // ensure topology key exists in networkState
      if (!networkState.hasOwnProperty(topologyName)) {
        networkState[topologyName] = {};
      }
      const primaryController = topologyItem.primary;
      topologyConfig[topologyName] = {
        name: topologyName,
        id: topologyItem.id,
        offline_whitelist: topologyItem.offline_whitelist,
        site_overrides: topologyItem.site_overrides,
        primary: {
          id: primaryController.id,
          api_ip: primaryController.api_ip,
          e2e_ip: primaryController.e2e_ip,
          e2e_port: primaryController.e2e_port,
          api_port: primaryController.api_port,
          controller_online: false,
        },
        controller_online: false,
        // TODO(BE)  use the api instead of attaching to instance config
        map_profile: attrToMapProfile(
          topologyItem?.map_profile?.toJSON() ?? {},
        ),
      };
      if (topologyItem.backup) {
        const backupController = topologyItem.backup;
        topologyConfig[topologyName].backup = {
          id: backupController.id,
          api_ip: backupController.api_ip,
          e2e_ip: backupController.e2e_ip,
          e2e_port: backupController.e2e_port,
          api_port: backupController.api_port,
          controller_online: false,
        };
      }
      if (topologyItem.wac) {
        const {wac} = topologyItem;
        topologyConfig[topologyName].wireless_controller = {
          id: wac.id,
          type: wac.type,
          url: wac.url,
          username: wac.username,
          // don't load the password, no need to show
        };
      }
    });
    // update instance config
    networkInstanceConfig = topologyConfig;
    return topologyConfig;
  });
}

function updateControllerVersion(request, success, responseTime, data) {
  if (data.version) {
    networkState[request.networkName].controller_version = data.version.slice(
      0,
      -2,
    );
  }
}

function updateSiteOverrides(request, success, responseTime, data) {
  const {site_overrides} = networkInstanceConfig[request.networkName];
  if (!site_overrides || !success) {
    return data;
  }
  // map site override site names so they can be applied on the topology
  const siteOverrideLocations = {};
  site_overrides.forEach(site => {
    siteOverrideLocations[site.name] = site;
  });
  // override each source site name with each destination
  data.sites = data.sites.map(site => {
    if (siteOverrideLocations.hasOwnProperty(site.name)) {
      // only replace the location
      return {
        ...site,
        location: siteOverrideLocations[site.name].location,
      };
    }
    return site;
  });
  return data;
}

function updateControllerState(request, success, _responseTime, _data) {
  // update controller state per role
  networkInstanceConfig[request.networkName][
    request.isPrimaryController ? 'primary' : 'backup'
  ].controller_online = success;
}

function updateTopologyState(request, _success, _responseTime, data) {
  updateInitialCoordinates(request.networkName);
  updateLinksMeta(request.networkName);
  updateTopologyName(request.networkName, request.isPrimaryController);
  updateOnlineWhitelist(request.networkName, {
    nodes: data.nodes,
    links: data.links,
  }).then(whitelist => {
    networkInstanceConfig[request.networkName].offline_whitelist = whitelist;
  });
}

function updateActiveController() {
  Object.keys(networkInstanceConfig).forEach(networkName => {
    const state = networkState[networkName];

    const bStarStatePrimary = _.get(
      state,
      ['high_availability', 'primary', 'state'],
      null,
    );
    const bStarStateBackup = _.get(
      state,
      ['high_availability', 'backup', 'state'],
      null,
    );
    const activeController = determineActiveController(
      bStarStatePrimary,
      bStarStateBackup,
    );
    state['active'] = activeController;
  });
}

// fetch topologies for all networks
function refreshTopologies(selectedNetwork = null) {
  // no networks defined
  if (!Object.keys(networkInstanceConfig).length) {
    return;
  }

  return cacheBackgroundCredentials().then(() => {
    const apiHighAvailabilityCalls = {
      getHighAvailabilityState: {
        stateKey: 'high_availability',
        callback: updateControllerState.bind(this),
      },
    };
    // fetch from api service for all topologies
    const apiCallsPerNetwork = {
      getTopology: {
        stateKey: 'topology',
        filterResult: updateSiteOverrides.bind(this),
        onSuccess: updateTopologyState.bind(this),
      },
      getCtrlStatusDump: {
        stateKey: 'status_dump',
        onSuccess: updateControllerVersion.bind(this),
      },
      getIgnitionState: {
        stateKey: 'ignition_state',
      },
      getUpgradeState: {
        stateKey: 'upgrade_state',
      },
      getAutoNodeOverridesConfig: {
        stateKey: 'config_auto_overrides',
      },
      getNodeOverridesConfig: {
        stateKey: 'config_node_overrides',
        onSuccess: updateConfigParams.bind(this),
      },
    };
    const haPromiseList = [];
    const startTime = new Date();
    Object.keys(networkInstanceConfig).forEach(networkName => {
      // restrict to selectedNetwork if set
      if (selectedNetwork !== null && selectedNetwork !== networkName) {
        return;
      }
      const networkConfig = networkInstanceConfig[networkName];
      // get the high availability state from every defined primary/backup
      // controller to determine where to send the remaining API calls
      Object.keys(apiHighAvailabilityCalls).forEach(apiRequestName => {
        haPromiseList.push(
          apiServiceRequest(
            networkConfig.name,
            true,
            networkConfig.primary.api_ip,
            networkConfig.primary.api_port,
            apiRequestName,
          ),
        );
        if (networkConfig.backup && networkConfig.backup.api_ip) {
          haPromiseList.push(
            apiServiceRequest(
              networkConfig.name,
              false,
              networkConfig.backup.api_ip,
              networkConfig.backup.api_port,
              apiRequestName,
            ),
          );
        }
      });
    });
    // No networks/requests to make
    if (haPromiseList.length === 0) {
      return;
    }
    Promise.all(haPromiseList)
      .then(haResults => {
        // determine active controller to make subsequent requests
        const haStatusByNetwork = {};
        haResults.forEach(({request, success, responseTime, data}) => {
          const apiCallMeta = apiHighAvailabilityCalls[request.apiMethod];
          const {isPrimaryController, networkName} = request;
          if (!haStatusByNetwork.hasOwnProperty(networkName)) {
            haStatusByNetwork[networkName] = {};
          }
          // store HA state by controller role
          if (!networkState[networkName].hasOwnProperty(apiCallMeta.stateKey)) {
            networkState[networkName][apiCallMeta.stateKey] = {};
          }
          networkState[networkName][apiCallMeta.stateKey][
            isPrimaryController ? 'primary' : 'backup'
          ] = data;
          // record HA status of each network
          haStatusByNetwork[networkName][
            isPrimaryController ? 'primary' : 'backup'
          ] = data;
          // perform call-back on success
          if (apiCallMeta.hasOwnProperty('callback')) {
            apiCallMeta.callback(request, success, responseTime, data);
          }
        });
        const networkPromiseList = [];
        // determine active controller
        Object.keys(haStatusByNetwork).forEach(networkName => {
          const haStatus = haStatusByNetwork[networkName];
          const activeController = determineActiveController(
            _.get(haStatus, ['primary', 'state'], null), // primary
            _.get(haStatus, ['backup', 'state'], null), // backup
          );
          // use the online state of the active controller
          const controllerOnline =
            networkInstanceConfig[networkName][
              activeController.active === HAPeerType.BACKUP
                ? 'backup'
                : 'primary'
            ].controller_online;
          networkState[networkName].controller_online = controllerOnline;
          networkInstanceConfig[
            networkName
          ].controller_online = controllerOnline;
          const networkConfig = networkInstanceConfig[networkName];
          // perform API call for active controller or primary controller if
          // neither is online
          Object.keys(apiCallsPerNetwork).forEach(apiRequestName => {
            const {api_port, api_ip} =
              activeController.active === HAPeerType.BACKUP
                ? networkConfig.backup
                : networkConfig.primary;
            networkPromiseList.push(
              apiServiceRequest(
                networkConfig.name,
                activeController.active === HAPeerType.PRIMARY,
                api_ip,
                api_port,
                apiRequestName,
              ),
            );
          });
        });
        return Promise.all(networkPromiseList);
      })
      .then(networkResults => {
        logger.debug(
          'API promises completed in ' + (new Date() - startTime) + 'ms',
        );
        networkResults.forEach(({request, success, responseTime, data}) => {
          const apiCallMeta = apiCallsPerNetwork[request.apiMethod];
          const {networkName} = request;
          // filter results before applying
          const filterData = apiCallMeta.hasOwnProperty('filterResult')
            ? apiCallMeta.filterResult(request, success, responseTime, data)
            : data;
          if (success) {
            // determine field to use for state storage
            networkState[networkName][apiCallMeta.stateKey] = filterData;
            if (apiCallMeta.hasOwnProperty('onSuccess')) {
              apiCallMeta.onSuccess(request, success, responseTime, filterData);
            }
          }
        });
      })
      .catch(error => {
        logger.error('Error getting HA status:', error.message);
      });
    // determine HA state once primary + backup have been queried
    updateActiveController();
  });
}

function cacheBackgroundCredentials() {
  if (!LOGIN_ENABLED) {
    return Promise.resolve();
  }
  return apiServiceClient.loadServiceCredentials();
}

function updateInitialCoordinates(networkName) {
  const {sites} = networkState[networkName].topology;

  // compute bounding rectangle from site locations (latitude/longitude)
  const longitudes = sites.map(site => site.location.longitude);
  const latitudes = sites.map(site => site.location.latitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  // add map bounds (format: [[west, south], [east, north]])
  let bounds;
  if (sites.length > 0) {
    bounds = [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  } else {
    // if a topology has no sites defined, default to MPK campus
    bounds = [
      [-122.149742, 37.4835208],
      [-122.145169, 37.4866381],
    ];
  }
  networkState[networkName].bounds = bounds;
}

function updateLinksMeta(networkName) {
  const {links, nodes, sites} = networkState[networkName].topology;

  // Create maps for easy location access
  const nodeMap = {};
  const siteMap = {};

  sites.forEach(site => {
    siteMap[site.name] = site;
  });
  nodes.forEach(node => {
    nodeMap[node.name] = node;
  });

  links.forEach(link => {
    const l1 = siteMap[nodeMap[link.a_node_name].site_name].location;
    const l2 = siteMap[nodeMap[link.z_node_name].site_name].location;

    if (!link.hasOwnProperty('_meta_')) {
      link._meta_ = {};
    }
    link._meta_.distance = approxDistance(l1, l2);
    link._meta_.angle = computeAngle(l1, l2);
  });
}

function updateTopologyName(networkName, isPrimaryController) {
  const {name} = networkState[networkName].topology;

  // If topology name is empty, set it to the NMS network name
  if (name === '') {
    const activeController =
      networkInstanceConfig[networkName][
        isPrimaryController ? 'primary' : 'backup'
      ];
    const {api_ip, api_port} = activeController;

    const data = {name: networkName};
    apiServiceRequest(
      networkName,
      isPrimaryController,
      api_ip,
      api_port,
      'setTopologyName',
      data,
    ).then(() => logger.info('Set topology name for network ' + networkName));
  }
}

function getNetworkState(networkName) {
  // overlay instance config
  if (
    networkInstanceConfig.hasOwnProperty(networkName) &&
    networkState.hasOwnProperty(networkName)
  ) {
    return {
      ...networkState[networkName],
      ...networkInstanceConfig[networkName],
      ...serviceState,
    };
  }
  return null;
}

function getApiActiveControllerAddress({topology}) {
  const networkState = getNetworkState(topology);
  let controllerConfig = networkState.primary;
  if (
    networkState.hasOwnProperty('active') &&
    networkState.active === HAPeerType.BACKUP
  ) {
    controllerConfig = networkState.backup;
  }
  const {api_ip, api_port} = controllerConfig;
  return {api_ip, api_port};
}

async function refreshNetworkHealth(topologyName) {
  await cacheNetworkHealthFromDb(topologyName, LINK_HEALTH_TIME_WINDOW_HOURS);
}

async function cacheNetworkHealthFromDb(topologyName, timeWindowHours) {
  networkLinkHealth[topologyName] = await fetchNetworkHealthFromDb(
    topologyName,
    timeWindowHours,
  );
}

async function fetchNetworkHealthFromDb(topologyName, timeWindowHours) {
  const eventsByLink = {};
  // TODO - account for missing gaps at the end
  const windowSeconds = timeWindowHours * 60 * 60;
  const curTs = new Date().getTime() / 1000;
  const minStartTs = curTs - 60 * 60 * timeWindowHours;
  return await getLinkEvents(topologyName, timeWindowHours).then(resp => {
    resp.forEach(linkEvent => {
      const {linkName, linkDirection, eventType, startTs, endTs} = linkEvent;
      // adjust time from DB
      // TODO - find a better way, maybe timestamp instead of datetime in mysql?
      let startTime = new Date(startTs).getTime() / 1000;
      let endTime = new Date(endTs).getTime() / 1000;
      if (linkDirection !== 'A') {
        // only use A direction for testing
        // TODO - use both somehow
        return;
      }
      if (!eventsByLink.hasOwnProperty(linkName)) {
        eventsByLink[linkName] = {};
      }
      if (!eventsByLink[linkName].hasOwnProperty('events')) {
        eventsByLink[linkName] = {
          events: [],
          linkAlive: 0,
          linkAvailForData: 0,
        };
      }
      // ensure time window boundaries
      if (startTime < minStartTs) {
        startTime = minStartTs;
      }
      if (endTime > curTs) {
        endTime = curTs;
      }
      // TODO - decimals
      const timeWindow = Number.parseInt((endTime - startTime) / 60);
      // format time in HH:MM:SS
      const startTimeStr = moment.unix(startTime).format('LTS');
      const endTimeStr = moment.unix(endTime).format('LTS');
      eventsByLink[linkName].events.push({
        description: `${timeWindow} min between ${startTimeStr} <-> ${endTimeStr}`,
        linkState: LinkStateType[eventType] || LinkStateType['LINK_UP'],
        startTime,
        endTime,
      });
    });
    // calculate availability
    Object.keys(eventsByLink).forEach(linkName => {
      const linkEvents = eventsByLink[linkName];
      const lastEvent = linkEvents.events.slice(-1)[0];
      // assume online between the last LINK_UP endTime and current time if
      // within the defined window
      let assumedOnlineSeconds = 0;
      if (
        lastEvent.linkState === LinkStateType['LINK_UP'] &&
        lastEvent.endTime >= curTs - STATS_ALLOWED_DELAY_SEC
      ) {
        // last end time is within the allowed range
        const lastEndTime = lastEvent.endTime;
        assumedOnlineSeconds = curTs - lastEndTime;
      }
      const availSeconds = linkEvents.events.reduce(
        (accumulator, {startTime, endTime}) =>
          accumulator + (endTime - startTime),
        0,
      );
      const dataDownSeconds = linkEvents.events
        .filter(event => event.linkState === LinkStateType['LINK_UP_DATADOWN'])
        .reduce(
          (accumulator, {startTime, endTime}) =>
            accumulator + (endTime - startTime),
          0,
        );
      // calculate the availability window by removing the window of time at
      // the end (from data-point lag) we assume to be available
      const alivePerc =
        Number.parseInt(
          (availSeconds / (windowSeconds - assumedOnlineSeconds)) * 10000.0,
        ) / 100.0;
      // remove LINK_UP_DATADOWN seconds from available %
      const availPerc =
        Number.parseInt(
          ((availSeconds - dataDownSeconds) /
            (windowSeconds - assumedOnlineSeconds)) *
            10000.0,
        ) / 100.0;
      linkEvents.linkAlive = alivePerc;
      linkEvents.linkAvailForData = availPerc;
    });
    return {
      events: eventsByLink,
      startTime: minStartTs,
      endTime: curTs,
    };
  });
}

function refreshPrometheusStatus() {
  // call the test handler to verify service is healthy
  const testHandlerUrl = PROMETHEUS_URL + '/-/healthy';
  axios.get(testHandlerUrl).then(res => {
    if (res.status !== 200) {
      logger.error('Error fetching from health status from Prometheus');
      serviceState.prometheus_online = false;
      return;
    }
    serviceState.prometheus_online = true;
  });
}

// This used to run every 5 seconds, but we now set up a persistent connection,
// wait for server sent events, and only query controller when an event is
// received. Could act on event change directly in the future, but these events
// do not happen frequently, maybe it is ok to just query the whole thing
function runNowAndWatchForTopologyUpdate() {
  logger.debug('watching for topology stream events');
  const topologies = Object.keys(networkState).map(
    keyName => networkState[keyName],
  );

  // update once for the first time, then wait for changes
  //doTopologyUpdate(topologies);

  const eventSourceInitDict = {
    // leaving the change in comment on purpose, for when we add security,
    // it is simple to add header
    // headers: {Authorization: 'Bearer your_access_token'},
  };

  if (process.env.http_proxy && process.env.http_proxy.length) {
    eventSourceInitDict.proxy = process.env.http_proxy;
  }

  topologies.forEach(topology => {
    const activeControllerIp =
      topology.controller_ip_active || topology.controller_ip;
    const baseUrl =
      activeControllerIp === topology.controller_ip
        ? getPeerAPIServiceHost(topology, HAPeerType.PRIMARY)
        : getPeerAPIServiceHost(topology, HAPeerType.BACKUP);
    let url = `${baseUrl}/api/stream/topology`;
    // Axios proxy needs [[]] for ipv6, we do not, have to unwrap
    url = url.replace('://[[', '://[');
    url = url.replace(']]:', ']:');

    // EventSource should handle auto retry if connection drops
    const es = new EventSource(url, eventSourceInitDict);
    let alreadyLostConnection = false;
    es.onerror = e => {
      if (!alreadyLostConnection) {
        // do not keep alerting if cannot connect
        logger.error(
          'Lost connection to topology events for controller ' +
            topology.name +
            ' at ' +
            url +
            '. Reason: ' +
            e.message,
        );
      }
      alreadyLostConnection = true;
    };
    es.onopen = _e => {
      alreadyLostConnection = false;
      logger.info(
        'Watching topology event from controller ' +
          topology.name +
          ' at ' +
          url,
      );
    };

    // when an event is received, something is changed, just query
    // for the new truth
    const eventHandler = function (event) {
      logger.debug(
        'received event type: ' + event.type + ' data: ' + event.data,
      );
      // query controller to get the whole changes
      //doTopologyUpdate([topology]); // only query the topology that changed
    };

    // EventSource does not support listening to *all* events, enumerate
    // one by one
    const eventsToWatch = [
      // "topology" related events
      'EVENT_ADD_NODE',
      'EVENT_DEL_NODE',
      'EVENT_EDIT_NODE',
      'EVENT_ADD_LINK',
      'EVENT_DEL_LINK',
      'EVENT_ADD_SITE',
      'EVENT_DEL_SITE',
      'EVENT_EDIT_SITE',
      // "statusChanges" related events
      'EVENT_NODE_STATUS',
      'EVENT_LINK_STATUS',
    ];
    for (const event of eventsToWatch) {
      es.addEventListener(event, eventHandler);
    }
  });
}

function setConfigParamsFromOverrides(topologyName, overrides) {
  Object.keys(overrides).forEach(nodeName => {
    const nodeConfig = overrides[nodeName];
    const topologyConfig = networkState[topologyName].topologyConfig;
    if (nodeConfig.hasOwnProperty('radioParamsOverride')) {
      Object.keys(nodeConfig.radioParamsOverride).forEach(macAddress => {
        const radioConfig = nodeConfig.radioParamsOverride[macAddress];
        if (radioConfig.fwParams && radioConfig.fwParams.polarity) {
          topologyConfig.polarity[macAddress] = radioConfig.fwParams.polarity;
        }
        // Per node channel configuration (post M40)
        if (radioConfig.fwParams && radioConfig.fwParams.channel) {
          topologyConfig.channel[macAddress] = radioConfig.fwParams.channel;
        } else {
          // Topology level channel configuration (pre M40)
          const networkState = getNetworkState(topologyName);
          if (
            networkState.topology &&
            networkState.topology.config &&
            networkState.topology.config.channel
          ) {
            topologyConfig.channel[macAddress] =
              networkState.topology.config.channel;
          }
        }
      });
    }

    if (!topologyConfig.golay[nodeName]) {
      topologyConfig.golay[nodeName] = {};
    }
    if (!topologyConfig.controlSuperframe[nodeName]) {
      topologyConfig.controlSuperframe[nodeName] = {};
    }

    if (nodeConfig.hasOwnProperty('linkParamsOverride')) {
      Object.keys(nodeConfig.linkParamsOverride).forEach(macAddress => {
        const LinkConfig = nodeConfig.linkParamsOverride[macAddress];
        if (
          LinkConfig.fwParams &&
          LinkConfig.fwParams.hasOwnProperty('rxGolayIdx') &&
          LinkConfig.fwParams.hasOwnProperty('txGolayIdx')
        ) {
          topologyConfig.golay[nodeName][macAddress] = {
            rxGolayIdx: LinkConfig.fwParams.rxGolayIdx,
            txGolayIdx: LinkConfig.fwParams.txGolayIdx,
          };
        }
        if (
          LinkConfig.fwParams &&
          LinkConfig.fwParams.hasOwnProperty('controlSuperframe')
        ) {
          topologyConfig.controlSuperframe[nodeName][macAddress] =
            LinkConfig.fwParams.controlSuperframe;
        }
      });
    }
  });
}

function updateConfigParams(request, _success, _responseTime, _data) {
  const topologyName = request.networkName;
  const nodeConfig = networkState[topologyName].config_node_overrides;
  const autoConfig = networkState[topologyName].config_auto_overrides;
  if (
    nodeConfig &&
    nodeConfig.overrides &&
    autoConfig &&
    autoConfig.overrides
  ) {
    networkState[topologyName].topologyConfig = {
      polarity: {},
      golay: {},
      controlSuperframe: {},
      channel: {},
    };

    setConfigParamsFromOverrides(
      topologyName,
      JSON.parse(autoConfig.overrides),
    );
    setConfigParamsFromOverrides(
      topologyName,
      JSON.parse(nodeConfig.overrides),
    );
  }
}

module.exports = {
  addRequester,
  fetchNetworkHealthFromDb,
  getAllTopologyNames,
  getAllNetworkConfigs,
  getNetworkConfig,
  getNetworkLinkHealth,
  getNetworkNodeHealth,
  getNetworkState,
  getApiActiveControllerAddress,
  refreshNetworkHealth,
  refreshTopologies,
  reloadInstanceConfig,
  removeRequester,
  runNowAndWatchForTopologyUpdate,
  refreshPrometheusStatus,
};
