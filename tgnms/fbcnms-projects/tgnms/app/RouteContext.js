/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import React from 'react';

type RouteContextType = {
  /*
   * use routeData to show generic routing visualization. This is useful for
   * showing the routes between any two nodes
   */
  routeData: RouteData,
  /*
   * By default, routes are overlayed for the currently
   * selected node (network context selection), this is an override
   * for that selection that's specific to the routing layer. Since
   * you must select the destination node for network speed test, we need to
   * keep a reference to the origin node in order to properly overlay
   * the route path.
   */
  selectedNode: ?string,
  setNodeRoutes: (nodeName: ?string, routes?: Array<Route>) => any,
};

// maps from node to its routes
export type RouteData = {
  [nodeName: string]: Array<Route>,
};

export type Route = {
  path: Array<string>,
};

const RouteContext = React.createContext<RouteContextType>({
  routeData: {},
  setNodeRoutes: () => {},
  selectedNode: null,
});

export default RouteContext;
