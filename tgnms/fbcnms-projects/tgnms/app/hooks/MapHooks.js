/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import * as React from 'react';
import NetworkContext from '../contexts/NetworkContext';
import RouteContext from '../contexts/RouteContext';
import axios from 'axios';
import {apiServiceRequest} from '../apiutils/ServiceAPIUtil';

/**
 * Loads the routes for the specified nodes and updates the routes map layer
 */
export function useNetworkRoutes({
  nodes,
  useNearestPop,
}: {
  nodes: Array<string>,
  useNearestPop: boolean,
}) {
  const [nodeA, nodeZ] = nodes;
  const {networkName} = React.useContext(NetworkContext);
  const {setNodeRoutes} = React.useContext(RouteContext);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<?string>(null);
  React.useEffect(() => {
    if (!(nodeA && (useNearestPop || nodeZ))) {
      return;
    }
    const cancelToken = axios.CancelToken.source();
    setLoading(true);
    const routesPromise = useNearestPop
      ? getDefaultRoutes({
          node: nodeA,
          networkName,
          cancelToken: cancelToken.token,
        })
      : getRoutes({
          nodes: [nodeA, nodeZ],
          networkName,
          cancelToken: cancelToken.token,
        });
    routesPromise
      .then(routes => {
        setNodeRoutes(nodeA, routes);
        setLoading(false);
      })
      .catch(error => {
        setLoading(false);
        if (error.message) {
          setError(error.message);
        } else {
          setError('Error loading routes');
        }
      });

    return cancelToken.cancel();
  }, [nodeA, nodeZ, networkName, setNodeRoutes, useNearestPop]);
  return {
    loading,
    error,
  };
}

// gets the default ecmp routes to the nearest pop
function getDefaultRoutes({
  networkName,
  node,
  cancelToken,
}: {
  networkName: string,
  node: string,
  cancelToken: axios.CancelToken,
}) {
  return apiServiceRequest(
    networkName,
    'getDefaultRoutes',
    {
      nodes: [node],
    },
    {
      token: cancelToken,
    },
  ).then(response => {
    const routes = response.data.defaultRoutes[node];
    return routes.map(path => ({
      path: path,
    }));
  });
}

// gets the routes between two nodes
function getRoutes({
  networkName,
  nodes,
  cancelToken,
}: {
  networkName: string,
  nodes: Array<string>,
  cancelToken: axios.CancelToken,
}) {
  const [nodeA, nodeZ] = nodes;
  return apiServiceRequest(
    networkName,
    'getRoutes',
    {
      srcNode: nodeA,
      dstNode: nodeZ,
    },
    {
      token: cancelToken,
    },
  ).then(response => {
    return response.data.routes.map(path => ({
      path: path,
    }));
  });
}
