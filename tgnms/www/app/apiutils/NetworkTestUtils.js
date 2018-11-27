/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 */
'use strict';

import axios from 'axios';

// docker hosts list
export const startNetworkTest = async (networkName, testId) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/network_tests/${networkName}/start/${testId}`)
      .then(response => {
        resolve(response.data);
      })
      .catch(error => {
        reject(error);
      });
  });
};
