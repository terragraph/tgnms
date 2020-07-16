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
  TOPOLOGY_SITE: 'TOPOLOGY_SITE',
  TOPOLOGY_UPLOAD: 'TOPOLOGY_UPLOAD',
  DEFAULT_ROUTES: 'DEFAULT_ROUTES',
  NETWORK_TEST: 'NETWORK_TEST',
  SPEED_TEST: 'SPEED_TEST',
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
  getIsOpen: (key: string) => boolean,
  getPanelState: (key: string) => PanelState,
  toggleOpen: (key: string) => void,
  setPanelState: (key: string, state: PanelState) => void,
  removePanel: (key: string) => void,
  collapseAll: () => void,
|};

export function usePanelControl({
  initialState,
}: {initialState?: PanelStates} = {}): PanelStateControl {
  const [state, setState] = React.useState<PanelStates>(initialState || {});
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const updateState = React.useCallback(
    (update: $Shape<PanelStates>) =>
      setState(curr => ({
        ...curr,
        ...update,
      })),
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
      setState(curr => {
        const nextState = {...curr};
        delete nextState[key];
        return nextState;
      });
    },
    [setState],
  );

  const collapseAll = React.useCallback(() => {
    for (const panel of Object.keys(getAll())) {
      if (getIsOpen(panel)) {
        setPanelState(panel, PANEL_STATE.COLLAPSED);
      }
    }
  }, [getAll, setPanelState, getIsOpen]);

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
  };
}
