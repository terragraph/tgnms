/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */
import * as React from 'react';

export type RoutesContext = {|
  node: ?string,
  links: {[string]: number},
  nodes: Set<string>,
  onUpdateRoutes: ({
    node: ?string,
    links: {[string]: number},
    nodes: Set<string>,
  }) => void,
  resetRoutes: () => void,
|};

export type Routes = {|
  node: ?string,
  links: {[string]: number},
  nodes: Set<string>,
|};

const defaultValue: $Shape<RoutesContext> = {
  node: null,
  links: {},
  nodes: new Set(),
  onUpdateRoutes: () => {},
  resetRoutes: () => {},
};

const context = React.createContext<RoutesContext>(defaultValue);

export function useRouteContext() {
  return React.useContext(context);
}

export type ProviderProps = {|
  children: React.Node,
  ...RoutesContext,
|};

export function Provider({
  children,
  node,
  links,
  nodes,
  onUpdateRoutes,
  resetRoutes,
}: ProviderProps) {
  return (
    <context.Provider value={{node, links, nodes, onUpdateRoutes, resetRoutes}}>
      {children}
    </context.Provider>
  );
}
