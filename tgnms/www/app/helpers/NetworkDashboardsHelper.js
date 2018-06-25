/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';
import axios from 'axios';
import {isEqual, flattenDeep} from 'lodash-es';

export const formatKeyHelper = key => {
  if (RegExp('\\d').test(key)) {
    return key.slice(22); // take off tgf.XX.XX.XX.XX.XX.XX. in front of key
  } else {
    return key;
  }
};

// Checks whether a key is a node key (mac adress of 00:00:00:00:00:00 or no
// mac address) and that the stat is for the requested nodes
export const isValidNodeKey = (keyObj, nodeMacAddrs) => {
  return (
    (!RegExp('\\d').test(keyObj.key) ||
      keyObj.key.includes('00:00:00:00:00:00')) &&
    nodeMacAddrs.has(keyObj.node)
  );
};

export const fetchKeyData = async (keys, topologyName) => {
  const asyncRequests = keys.map(key =>
    axios.get(`/stats_ta/${topologyName}/${key}`),
  );
  const responses = await Promise.all(asyncRequests);
  const responseData = responses.map(resp => resp.data);
  const keyData = flattenDeep(responseData);
  return {
    keyData,
    keyIds: keyData.map(keyObj => keyObj.keyId),
  };
};

export const fetchAggregatedData = (query, topologyName) => {
  return axios.get('/stats_ta/' + topologyName + '/' + query);
};

export const shouldUpdateGraphFormOptions = (
  prevDashboard,
  nextDashboard,
  prevFormData,
  nextFormData,
) => {
  return (
    !isEqual(prevDashboard, nextDashboard) ||
    prevFormData.useDashboardGraphConfigChecked !==
      nextFormData.useDashboardGraphConfigChecked ||
    !isEqual(prevFormData.customData, nextFormData.customData)
  );
};
