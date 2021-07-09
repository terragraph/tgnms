/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {
  PANELS,
  PANEL_STATE,
  usePanelControl,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {act, renderHook} from '@testing-library/react-hooks';

jest.mock('mapbox-gl', () => ({
  Map: () => ({}),
}));

describe('usePanelControl', () => {
  test('panel states default to initialState passed in', () => {
    const {result} = renderHook(() =>
      usePanelControl({
        initialState: {
          OVERVIEW: PANEL_STATE.OPEN,
          MAP_LAYERS: PANEL_STATE.COLLAPSED,
          IGNITION_STATE: PANEL_STATE.HIDDEN,
          ACCESS_POINTS: PANEL_STATE.HIDDEN,
          UPGRADE_PROGRESS: PANEL_STATE.HIDDEN,
          TOPOLOGY: PANEL_STATE.HIDDEN,
        },
      }),
    );
    expect(result.current.getIsOpen(PANELS.OVERVIEW)).toBe(true);
  });
  test('get/set panelState get/set current state of panels', () => {
    const {result} = renderHook(() =>
      usePanelControl({
        initialState: {
          OVERVIEW: PANEL_STATE.OPEN,
          MAP_LAYERS: PANEL_STATE.COLLAPSED,
          IGNITION_STATE: PANEL_STATE.HIDDEN,
          ACCESS_POINTS: PANEL_STATE.HIDDEN,
          UPGRADE_PROGRESS: PANEL_STATE.HIDDEN,
          TOPOLOGY_NODE: PANEL_STATE.HIDDEN,
        },
      }),
    );
    expect(result.current.getPanelState(PANELS.OVERVIEW)).toBe(
      PANEL_STATE.OPEN,
    );
    expect(result.current.getPanelState(PANELS.MAP_LAYERS)).toBe(
      PANEL_STATE.COLLAPSED,
    );
    act(() => {
      result.current.setPanelState(PANELS.IGNITION_STATE, PANEL_STATE.OPEN);
    });
    act(() => {
      result.current.setPanelState(
        PANELS.MANUAL_TOPOLOGY,
        PANEL_STATE.COLLAPSED,
      );
    });
    expect(result.current.getPanelState(PANELS.IGNITION_STATE)).toBe(
      PANEL_STATE.OPEN,
    );
    expect(result.current.getPanelState(PANELS.MANUAL_TOPOLOGY)).toBe(
      PANEL_STATE.COLLAPSED,
    );
  });
  test('test the shorthand getters', () => {
    const {result} = renderHook(() =>
      usePanelControl({
        initialState: {
          OVERVIEW: PANEL_STATE.OPEN,
          MAP_LAYERS: PANEL_STATE.COLLAPSED,
          IGNITION_STATE: PANEL_STATE.HIDDEN,
          ACCESS_POINTS: PANEL_STATE.HIDDEN,
          UPGRADE_PROGRESS: PANEL_STATE.HIDDEN,
          TOPOLOGY: PANEL_STATE.HIDDEN,
        },
      }),
    );
    expect(result.current.getIsOpen(PANELS.OVERVIEW)).toBe(true);
    expect(result.current.getIsCollapsed(PANELS.OVERVIEW)).toBe(false);
    expect(result.current.getIsHidden(PANELS.OVERVIEW)).toBe(false);

    expect(result.current.getIsOpen(PANELS.MAP_LAYERS)).toBe(false);
    expect(result.current.getIsCollapsed(PANELS.MAP_LAYERS)).toBe(true);
    expect(result.current.getIsHidden(PANELS.MAP_LAYERS)).toBe(false);

    expect(result.current.getIsOpen(PANELS.IGNITION_STATE)).toBe(false);
    expect(result.current.getIsCollapsed(PANELS.IGNITION_STATE)).toBe(false);
    expect(result.current.getIsHidden(PANELS.IGNITION_STATE)).toBe(true);
  });

  test('toggle', () => {
    const {result} = renderHook(() =>
      usePanelControl({
        initialState: {
          OVERVIEW: PANEL_STATE.OPEN,
          MAP_LAYERS: PANEL_STATE.COLLAPSED,
          IGNITION_STATE: PANEL_STATE.HIDDEN,
          ACCESS_POINTS: PANEL_STATE.HIDDEN,
          UPGRADE_PROGRESS: PANEL_STATE.HIDDEN,
          TOPOLOGY: PANEL_STATE.HIDDEN,
        },
      }),
    );
    expect(result.current.getPanelState(PANELS.OVERVIEW)).toBe(
      PANEL_STATE.OPEN,
    );
    act(() => {
      result.current.toggleOpen(PANELS.OVERVIEW);
    });
    expect(result.current.getPanelState(PANELS.OVERVIEW)).toBe(
      PANEL_STATE.COLLAPSED,
    );
    act(() => {
      result.current.toggleOpen(PANELS.OVERVIEW);
    });
    expect(result.current.getPanelState(PANELS.OVERVIEW)).toBe(
      PANEL_STATE.OPEN,
    );
  });

  test('getIsHidden returns true for panels which have been removed', () => {
    const {result} = renderHook(() =>
      usePanelControl({
        initialState: {
          OVERVIEW: PANEL_STATE.OPEN,
        },
      }),
    );
    act(() => {
      result.current.setPanelState('test_custom', PANEL_STATE.OPEN);
    });
    expect(result.current.getPanelState('test_custom')).toBe(PANEL_STATE.OPEN);
    act(() => {
      result.current.removePanel('test_custom');
    });
    expect(result.current.getIsHidden('test_custom')).toBe(true);
  });
});
