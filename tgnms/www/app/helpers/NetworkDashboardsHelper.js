/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';
import axios from 'axios';

export const formatKeyHelper = (key) => {
  if (RegExp('\\d').test(key)) {
    return key.slice(22); // take off tgf.XX.XX.XX.XX.XX.XX. in front of key
  } else {
    return key;
  }
}

export const fetchKeyData = async (keys, topologyName) => {
    const asyncGraphData = keys.map(async key => {
      return await axios.get(`/stats_ta/${topologyName}/${key}`);
    });

    const graphData = Promise.all(asyncGraphData).then(responses => {
      const keyIds = [];
      const keyData = [];
      responses.forEach(resp => {
        resp.data.forEach(keyArr => {
          keyArr.forEach(keyObj => {
            keyIds.push(keyObj.keyId);
            keyData.push(keyObj);
          });
        });
      });
      return {
        keyIds,
        keyData,
      };
    });
    return graphData;
  };

export const fetchAggregatedData = (query, topologyName) => {
  return axios.get('/stats_ta/' + topologyName + '/' + query);
}
