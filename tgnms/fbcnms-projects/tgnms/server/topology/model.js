/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const {
  LINK_HEALTH_TIME_WINDOW_HOURS,
  LOGIN_ENABLED,
  PROMETHEUS_URL,
  STATS_ALLOWED_DELAY_SEC,
} = require('../config');
import apiServiceClient from '../apiservice/apiServiceClient';
import {HAPeerType} from '@fbcnms/tg-nms/shared/dto/NetworkState';
import {LinkStateType} from '../../thrift/gen-nodejs/Stats_types';
import {approxDistance, computeAngle} from './helpers';
import {determineActiveController} from '../high_availability/model';
import {getLinkEvents, getNetworkList, updateOnlineWhitelist} from './network';
const _ = require('lodash');
const logger = require('../log')(module);
import axios from 'axios';
import moment from 'moment';

import type {
  LinkHealth,
  NetworkHealth,
  NetworkInstanceConfig,
  NetworkState,
  ServerNetworkState,
} from '../../shared/dto/NetworkState';
import type {Response} from '../types/express';
import type {StatusDumpType} from '@fbcnms/tg-nms/shared/types/Controller';

type NetworkStateMap = {|
  [string]: ServerNetworkState,
|};

type TopologyConfigMap = {|
  [string]: $Shape<NetworkInstanceConfig>,
|};

const networkLinkHealth = {};
// hold the network configuration (primary/backup)
let networkInstanceConfig: {|[string]: NetworkInstanceConfig|} = {};

// hold all state
const networkState: NetworkStateMap = {};
// This array and the two functions below keep tracks of topology
// stream event connections from browsers
let topologyEventRequesters = [];

export function addRequester(name: string, res: Response) {
  topologyEventRequesters.push({topologyName: name, response: res});
  // although we remove session when user disconnects, it is still a good idea
  // to protect in case the session ended, otherwise, it will crash the server
  res.on('error', e => {
    logger.error('Event stream write error for ' + name + '. Reason: ' + e);
  });
  return;
}

export function removeRequester(response: Response) {
  // session is gone, delete reference
  topologyEventRequesters = topologyEventRequesters.filter(item => {
    return item.response !== response;
  });
}

export function getAllTopologyNames(): Array<string> {
  return Object.keys(networkInstanceConfig);
}

export function getNetworkLinkHealth(topologyName: string) {
  return _.get(networkLinkHealth, topologyName);
}

export function getAllNetworkConfigs() {
  return networkInstanceConfig;
}

export function getNetworkConfig(networkName: string) {
  if (networkInstanceConfig.hasOwnProperty(networkName)) {
    return networkInstanceConfig[networkName];
  }
  return null;
}

// DEPRECATED - use apiServiceClient.backgroundRequest directly instead
export async function apiServiceRequest(
  networkName: string,
  isPrimaryController: boolean,
  host: string,
  port: number,
  apiMethod: string,
  data: Object,
  config: Object,
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
export async function reloadInstanceConfig(): Promise<TopologyConfigMap> {
  logger.debug('Reloading instance config');
  const topologyConfig: TopologyConfigMap = {};
  return getNetworkList().then(topologyList => {
    topologyList.forEach(topologyItem => {
      const topologyName = topologyItem.name;
      // ensure topology key exists in networkState
      if (!networkState.hasOwnProperty(topologyName)) {
        networkState[topologyName] = ({}: $Shape<ServerNetworkState>);
      }
      const primaryController = topologyItem.primary;
      const networkInstance: $Shape<NetworkInstanceConfig> = {
        name: topologyName,
        id: topologyItem.id,
        offline_whitelist: topologyItem.offline_whitelist,
        site_overrides: topologyItem.site_overrides,
        primary: {
          id: primaryController?.id ?? 0,
          api_ip: primaryController?.api_ip ?? '',
          e2e_ip: primaryController?.e2e_ip ?? '',
          e2e_port: primaryController?.e2e_port ?? 0,
          api_port: primaryController?.api_port ?? 0,
          controller_online: false,
        },
        controller_online: false,
        map_profile_id: topologyItem?.map_profile?.id,
        prometheus_url: topologyItem.prometheus_url,
        queryservice_url: topologyItem.queryservice_url,
        alertmanager_url: topologyItem.alertmanager_url,
        alertmanager_config_url: topologyItem.alertmanager_config_url,
        prometheus_config_url: topologyItem.prometheus_config_url,
        event_alarm_url: topologyItem.event_alarm_url,
      };
      topologyConfig[topologyName] = networkInstance;
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

export function onStatusDumpSuccess(
  request: {networkName: string},
  success: boolean,
  responseTime: number,
  data: StatusDumpType,
) {
  // first, clear the timestamp
  data.timeStamp = 0;
  Object.keys(data.statusReports).forEach(mac => {
    // these timestamps are unused and cause excessive rerendering
    const report = (data.statusReports[mac]: any);
    delete report.lastAckGpsTimestamp;
    delete report.sentGpsTimestamp;
    delete report.timeStamp;
  });

  if (data.version) {
    networkState[request.networkName].controller_version = data.version.slice(
      0,
      -2,
    );
  }
}

export function updateSiteOverrides(
  request: {networkName: string},
  success: boolean,
  responseTime: number,
  data: Object,
) {
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

export function updateControllerState(
  request: {networkName: string, isPrimaryController: boolean},
  success: boolean,
  _responseTime: number,
  _data: Object,
) {
  // update controller state per role
  const config =
    networkInstanceConfig[request.networkName][
      request.isPrimaryController ? 'primary' : 'backup'
    ];
  if (config != null) {
    config.controller_online = success;
  }
}

export function updateTopologyState(
  request: {networkName: string, isPrimaryController: boolean},
  _success: boolean,
  _responseTime: number,
  data: Object,
) {
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

export function updateActiveController() {
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
export function refreshTopologies(selectedNetwork: ?string = null) {
  // no networks defined
  if (!Object.keys(networkInstanceConfig).length) {
    return;
  }

  return cacheBackgroundCredentials().then(() => {
    const apiHighAvailabilityCalls = {
      getHighAvailabilityState: {
        stateKey: 'high_availability',
        callback: updateControllerState,
      },
    };
    // fetch from api service for all topologies
    const apiCallsPerNetwork = {
      getTopology: {
        stateKey: 'topology',
        filterResult: updateSiteOverrides,
        onSuccess: updateTopologyState,
      },
      getCtrlStatusDump: {
        stateKey: 'status_dump',
        onSuccess: onStatusDumpSuccess,
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
        onSuccess: updateConfigParams,
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
            ]?.controller_online ?? false;
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
                ? networkConfig.backup ?? {}
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

export function cacheBackgroundCredentials() {
  if (!LOGIN_ENABLED) {
    return Promise.resolve();
  }
  return apiServiceClient.loadServiceCredentials();
}

export function updateInitialCoordinates(networkName: string) {
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

export function updateLinksMeta(networkName: string) {
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
    link._meta_ = {
      ...(link._meta_ ?? {}),
      distance: approxDistance(l1, l2),
      angle: computeAngle(l1, l2),
    };
  });
}

export function updateTopologyName(
  networkName: string,
  isPrimaryController: boolean,
) {
  const {name} = networkState[networkName].topology;

  // If topology name is empty, set it to the NMS network name
  if (name === '') {
    const activeController =
      networkInstanceConfig[networkName][
        isPrimaryController ? 'primary' : 'backup'
      ];
    const {api_ip, api_port} = activeController ?? {};

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

export function getNetworkState(networkName: string): ?NetworkState {
  // overlay instance config
  if (
    networkInstanceConfig.hasOwnProperty(networkName) &&
    networkState.hasOwnProperty(networkName)
  ) {
    const state = {
      ...networkState[networkName],
      ...networkInstanceConfig[networkName],
    };
    return state;
  }
  return null;
}

export function getApiActiveControllerAddress({
  topology,
}: {
  topology: string,
}): {api_ip: string, api_port: number} {
  const networkState = getNetworkState(topology);
  let controllerConfig = networkState?.primary;
  if (
    networkState?.hasOwnProperty('active') &&
    networkState?.active === HAPeerType.BACKUP
  ) {
    controllerConfig = networkState?.backup;
  }
  if (!controllerConfig) {
    return {};
  }
  const {api_ip, api_port} = controllerConfig;
  return {api_ip, api_port};
}

export async function refreshNetworkHealth(topologyName: string) {
  await cacheNetworkHealthFromDb(topologyName, LINK_HEALTH_TIME_WINDOW_HOURS);
}

export async function cacheNetworkHealthFromDb(
  topologyName: string,
  timeWindowHours: number,
) {
  networkLinkHealth[topologyName] = await fetchNetworkHealthFromDb(
    topologyName,
    timeWindowHours,
  );
}

export async function fetchNetworkHealthFromDb(
  topologyName: string,
  timeWindowHours: number,
): Promise<NetworkHealth> {
  const eventsByLink: {[string]: LinkHealth} = {};
  // TODO - account for missing gaps at the end
  const windowSeconds = timeWindowHours * 60 * 60;
  const curTs = new Date().getTime() / 1000;
  const minStartTs = curTs - 60 * 60 * timeWindowHours;
  return getLinkEvents(topologyName, timeWindowHours).then(resp => {
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
        eventsByLink[linkName] = ({}: $Shape<LinkHealth>);
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
      const timeWindow = parseInt((endTime - startTime) / 60);
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
      const availSeconds: number = linkEvents.events.reduce(
        (accumulator, {startTime, endTime}) =>
          accumulator + (endTime - startTime),
        0,
      );
      const dataDownSeconds: number = linkEvents.events
        .filter(event => event.linkState === LinkStateType['LINK_UP_DATADOWN'])
        .reduce(
          (accumulator, {startTime, endTime}) =>
            accumulator + (endTime - startTime),
          0,
        );
      // calculate the availability window by removing the window of time at
      // the end (from data-point lag) we assume to be available
      const alivePerc =
        parseInt(
          (availSeconds / (windowSeconds - assumedOnlineSeconds)) * 10000.0,
        ) / 100.0;
      // remove LINK_UP_DATADOWN seconds from available %
      const availPerc =
        parseInt(
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

export async function refreshPrometheusStatus(
  networkName: string,
): Promise<void> {
  try {
    // call the test handler to verify service is healthy
    const testHandlerUrl = PROMETHEUS_URL + '/-/healthy';
    const res = await axios.get(testHandlerUrl);
    if (res.status !== 200) {
      throw new Error('Error fetching from health status from Prometheus');
    }
    networkState[networkName].prometheus_online = true;
  } catch (err) {
    logger.error(err.message);
  }
}

export function setConfigParamsFromOverrides(
  topologyName: string,
  overrides: Object,
) {
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
            networkState?.topology &&
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

export function updateConfigParams(
  request: {networkName: string},
  _success: boolean,
  _responseTime: number,
  _data: Object,
) {
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
