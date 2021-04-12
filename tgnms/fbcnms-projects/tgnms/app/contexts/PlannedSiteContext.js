/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import type {LocationType} from '@fbcnms/tg-nms/shared/types/Topology';
//TODO extract from mappaneltypes
import type {PlannedSite} from '@fbcnms/tg-nms/app/components/mappanels/MapPanelTypes';

export type PlannedSiteContext = {|
  plannedSite: ?PlannedSite,
  setLocation: (location: $Shape<LocationType>) => void,
  update: (plannedSite: ?$Shape<PlannedSite>) => void,
|};

const empty = () => {};
export const defaultValue: PlannedSiteContext = {
  plannedSite: null,
  setLocation: empty,
  update: empty,
};

const context = React.createContext<PlannedSiteContext>(defaultValue);
export default context;

export type ProviderProps = {|
  children: React.Node,
|};

export function PlannedSiteContextProvider({children}: ProviderProps) {
  const {Provider} = context;
  const [plannedSite, setPlannedSite] = React.useState<?PlannedSite>(null);
  const update = React.useCallback(
    (plannedSite: ?$Shape<PlannedSite>) => {
      setPlannedSite(curr => {
        if (plannedSite == null) {
          return null;
        }
        return {
          ...(curr || {name: ''}),
          ...plannedSite,
        };
      });
    },
    [setPlannedSite],
  );
  const setLocation = React.useCallback(
    (location: LocationType) => update(location),
    [update],
  );
  const providerVal = React.useMemo<PlannedSiteContext>(
    () => ({
      plannedSite,
      setLocation,
      update,
    }),
    [plannedSite, setLocation, update],
  );
  return <Provider value={providerVal}>{children}</Provider>;
}

export function usePlannedSiteContext(): PlannedSiteContext {
  const ctx = React.useContext(context);
  return ctx;
}
