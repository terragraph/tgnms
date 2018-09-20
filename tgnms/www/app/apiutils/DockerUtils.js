/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 */
'use strict';

import axios from 'axios';

// docker hosts list
export const getDockerHosts = async () => {
  return new Promise((resolve, reject) => {
    axios
      .get(`/docker/hosts`)
      .then(response => {
        resolve(response.data);
      })
      .catch(error => {
        reject(error);
      });
  });
};

// GET request for a single docker host
export const dockerApiReq = async (hostId, cmd) => {
  return new Promise((resolve, reject) => {
    axios.get(`/docker/${hostId}/${cmd}`)
      .then(response => {
        resolve(response.data);
      })
      .catch(error => {
        reject(error);
      });
  });
};

export const getContainersJson = async hostId => {
  return dockerApiReq(hostId, 'containers');
};

export const getImageJson = async hostId => {
  return dockerApiReq(hostId, 'images');
};

export const deleteImageById = async (hostId, imageId) => {
  return dockerApiReq(hostId, `images/delete/${imageId}`);
};
