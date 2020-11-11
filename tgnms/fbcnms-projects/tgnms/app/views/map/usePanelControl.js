/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';

export const PANELS = {
  OVERVIEW: 'OVERVIEW',
  MAP_LAYERS: 'MAP_LAYERS',
  IGNITION_STATE: 'IGNITION_STATE',
  ACCESS_POINTS: 'ACCESS_POINTS',
  UPGRADE_PROGRESS: 'UPGRADE_PROGRESS',
  TOPOLOGY_NODE: 'TOPOLOGY_NODE',
  TOPOLOGY_LINK: 'TOPOLOGY_LINK',
  L2_TUNNEL: 'L2_TUNNEL',
  TOPOLOGY_SITE: 'TOPOLOGY_SITE',
  TOPOLOGY_UPLOAD: 'TOPOLOGY_UPLOAD',
  DEFAULT_ROUTES: 'DEFAULT_ROUTES',
  NETWORK_TEST: 'NETWORK_TEST',
  SPEED_TEST: 'SPEED_TEST',
  ANNOTATIONS: 'ANNOTATIONS',
  CUSTOM_OVERLAY_METADATA: 'CUSTOM_OVERLAY_METADATA',
};

export const PANEL_STATE = {
  HIDDEN: -1, // not visible at all
  COLLAPSED: 0,
  OPEN: 1,
};

export type PanelState = $Values<typeof PANEL_STATE>;
export type PanelStates = {|
  [string]: PanelState,
|};
export type PanelStateControl = {|
  getAll: () => PanelStates,
  getIsOpen: (key: string) => boolean,
  getIsHidden: (key: string) => boolean,
  getIsCollapsed: (key: string) => boolean,
  getPanelState: (key: string) => PanelState,
  toggleOpen: (key: string) => void,
  setPanelState: (key: string, state: PanelState) => void,
  removePanel: (key: string) => void,
  collapseAll: () => void,
  getIsAnyOpen: () => boolean,
|};

export function usePanelControl({
  initialState,
}: {initialState?: PanelStates} = {}): PanelStateControl {
  const [state, setState] = React.useState<PanelStates>(initialState || {});
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const updateState = React.useCallback(
    (update: $Shape<PanelStates>) => {
      const next = {...stateRef.current, ...update};
      stateRef.current = next;
      setState(next);
    },
    [setState],
  );
  const getAll = React.useCallback(() => stateRef.current, [stateRef]);
  const setPanelState = React.useCallback(
    (key: string, state: PanelState) => updateState({[(key: string)]: state}),
    [updateState],
  );
  const getPanelState = React.useCallback(
    (key: string) => stateRef.current[key],
    [stateRef],
  );
  const getIsOpen = React.useCallback(
    (key: string) => getPanelState(key) === PANEL_STATE.OPEN,
    [getPanelState],
  );
  const getIsCollapsed = React.useCallback(
    (key: string) => getPanelState(key) === PANEL_STATE.COLLAPSED,
    [getPanelState],
  );
  const getIsHidden = React.useCallback(
    (key: string) => {
      const s = getPanelState(key);
      return typeof s === 'undefined' || s === PANEL_STATE.HIDDEN;
    },
    [getPanelState],
  );
  const toggleOpen = React.useCallback(
    (key: string) => {
      const curr = getPanelState(key);
      if (curr === PANEL_STATE.OPEN) {
        return setPanelState(key, PANEL_STATE.COLLAPSED);
      }
      return setPanelState(key, PANEL_STATE.OPEN);
    },
    [getPanelState, setPanelState],
  );
  const removePanel = React.useCallback(
    (key: string) => {
      if (key in PANELS) {
        console.error(`Deleting static panel: ${key}`);
      }
      delete stateRef.current[key];
      setState(curr => {
        const nextState = {...curr};
        delete nextState[key];
        return nextState;
      });
    },
    [setState],
  );

  const collapseAll = React.useCallback(() => {
    const update = {};
    for (const panel of Object.keys(getAll())) {
      if (getIsOpen(panel)) {
        update[panel] = PANEL_STATE.COLLAPSED;
      }
    }
    updateState(update);
  }, [getAll, setPanelState, getIsOpen]);

  const getIsAnyOpen = React.useCallback(() => {
    return Object.values(getAll()).includes(PANEL_STATE.OPEN);
  }, [getAll]);

  return {
    getAll,
    getIsHidden,
    getIsCollapsed,
    getIsOpen,
    getPanelState,
    toggleOpen,
    setPanelState,
    /**
     * Only use this for deleting dynamic panels
     */
    removePanel,
    collapseAll,
    getIsAnyOpen,
  };
}
