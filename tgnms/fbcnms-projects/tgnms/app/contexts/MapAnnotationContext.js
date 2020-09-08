/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as mapApiUtil from '../apiutils/MapAPIUtil';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import useTaskState, {TASK_STATE} from '../hooks/useTaskState';
import {
  MAPBOX_DRAW_DEFAULT_COLOR,
  MAPBOX_DRAW_DEFAULT_STYLES,
  MAPBOX_DRAW_DEFAULT_STYLE_IDS,
  MAPBOX_DRAW_VERTEX_COLOR,
  TG_DRAW_STYLES,
} from '../constants/MapAnnotationConstants';
import {useNetworkContext} from './NetworkContext';
import type {FeatureId, GeoFeature, GeoFeatureCollection} from '@turf/turf';
import type {
  MapAnnotationGroup,
  MapAnnotationGroupIdent,
} from '../../shared/dto/MapAnnotations';

// for now, only use one annotation group
export const ANNOTATION_DEFAULT_GROUP = 'default';

type SetState<S> = {
  ((S => S) | S): void,
};
type UpdateFeaturePropery = {
  (id: FeatureId, prop: string, val: ?string | ?number | ?boolean): void,
};
export type MapAnnotationContext = {|
  isDrawEnabled: boolean,
  setIsDrawEnabled: boolean => void,
  current: ?MapAnnotationGroup,
  setCurrent: SetState<?MapAnnotationGroup>,
  groups: Array<MapAnnotationGroupIdent>,
  setGroups: SetState<Array<MapAnnotationGroupIdent>>,
  selectedFeatureId: ?FeatureId,
  setSelectedFeatureId: SetState<?FeatureId>,
  selectedFeature: ?GeoFeature,
  getFeature: (s: string) => ?GeoFeature,
  drawControl: typeof MapboxDraw,
  updateFeatures: GeoFeatureCollection => Promise<MapAnnotationGroup>,
  deselectAll: () => void,
|};

const empty = () => {};
const emptyPromise = () => Promise.reject();
export const defaultValue: MapAnnotationContext = {
  isDrawEnabled: false,
  setIsDrawEnabled: empty,
  current: null,
  setCurrent: empty,
  groups: [],
  selectedFeatureId: null,
  setSelectedFeatureId: empty,
  setGroups: empty,
  selectedFeature: null,
  getFeature: empty,
  drawControl: new MapboxDraw(),
  updateFeatures: emptyPromise,
  deselectAll: empty,
};

export const context = React.createContext<MapAnnotationContext>(defaultValue);
export function useMapAnnotationContext() {
  return React.useContext<MapAnnotationContext>(context);
}

export function MapAnnotationContextProvider({
  children,
}: {
  children: React.Node,
}) {
  const {networkName} = useNetworkContext();
  const [isDrawEnabled, setIsDrawEnabled] = React.useState(false);
  const drawControl = useDrawControl();
  const [current, setCurrent] = React.useState<?MapAnnotationGroup>(null);
  const [selectedFeatureId, setSelectedFeatureId] = React.useState<?FeatureId>(
    null,
  );
  const [groups, setGroups] = React.useState<Array<MapAnnotationGroupIdent>>(
    [],
  );
  const selectedFeature =
    selectedFeatureId && isDrawEnabled
      ? drawControl.get(selectedFeatureId)
      : null;

  const getFeature = React.useCallback((id: string) => drawControl.get(id), [
    drawControl,
  ]);

  const updateFeatures = React.useCallback(
    async (updated: GeoFeatureCollection) => {
      // save to backend
      const saved = await mapApiUtil.saveAnnotationGroup({
        networkName,
        group: {
          id: current?.id,
          name: current?.name || ANNOTATION_DEFAULT_GROUP,
          geojson: JSON.stringify(updated),
        },
      });
      // update local state to include database primary key and things
      setCurrent(saved);
      return saved;
    },
    [setCurrent, current, networkName],
  );

  const deselectAll = React.useCallback(() => {
    // changing mode back to simple_select with no features deselects everything
    drawControl.changeMode('simple_select');
    setSelectedFeatureId(null);
  }, [drawControl]);
  return (
    <context.Provider
      value={{
        isDrawEnabled,
        setIsDrawEnabled,
        current,
        setCurrent,
        groups,
        setGroups,
        selectedFeatureId,
        setSelectedFeatureId,
        selectedFeature,
        getFeature,
        updateFeatures,
        deselectAll,

        /**
         * usually, don't use the draw control directly as a consumer.
         * Make a more nicely named helper function in this context
         */
        drawControl,
      }}>
      {children}
    </context.Provider>
  );
}

/**
 * Keeps the backend synced with the frontend
 */
export function useMapAnnotationGroupState({
  networkName,
  groupName,
}: {
  networkName: string,
  groupName: string,
}): {} {
  const {setCurrent: setAnnotationGroup} = useMapAnnotationContext();
  const {isLoading, isError} = useTaskState({
    initialState: TASK_STATE.LOADING,
  });

  React.useEffect(() => {
    async function loadAnnotationGroup() {
      const g = await mapApiUtil.getAnnotationGroup({networkName, groupName});
      if (g) {
        setAnnotationGroup(g);
      }
    }
    loadAnnotationGroup();
  }, [networkName, groupName, setAnnotationGroup]);

  return {
    isLoading,
    isError,
  };
}

export function useAnnotationGroups(): {
  groups: Array<MapAnnotationGroupIdent>,
  loadGroup: ({name: string}) => Promise<?MapAnnotationGroup>,
  loadGroups: () => Promise<void>,
} {
  const {
    setCurrent,
    drawControl,
    groups,
    setGroups,
  } = useMapAnnotationContext();
  const {networkName} = useNetworkContext();
  const taskState = useTaskState();
  const loadGroup = React.useCallback(
    async ({name}: {name: string}): Promise<?MapAnnotationGroup> => {
      try {
        taskState.setState(TASK_STATE.LOADING);
        const group = await mapApiUtil.getAnnotationGroup({
          networkName,
          groupName: name,
        });
        if (!group) {
          throw new Error(`Group: ${name} not found`);
        }
        setCurrent(group);
        drawControl.set(group.geojson);
        taskState.setState(TASK_STATE.SUCCESS);
        return group;
      } catch (err) {
        taskState.setState(TASK_STATE.ERROR);
        taskState.setMessage(err?.message ?? 'Error');
        return null;
      }
    },
    [taskState, setCurrent, drawControl, networkName],
  );

  const loadGroups = React.useCallback(async () => {
    try {
      taskState.setState(TASK_STATE.LOADING);
      const _groups = await mapApiUtil.getAnnotationGroups({networkName});
      if (_groups) {
        setGroups(_groups);
      }
      taskState.setState(TASK_STATE.SUCCESS);
    } catch (err) {
      taskState.setState(TASK_STATE.ERROR);
    }
  }, [networkName, taskState, setGroups]);

  return {
    groups,
    loadGroups,
    loadGroup,
    ...taskState,
  };
}

type DeleteFeature = {
  (?FeatureId): Promise<void>,
};
export function useAnnotationFeatures(): {
  updateFeatureProperty: UpdateFeaturePropery,
  deleteFeature: DeleteFeature,
} {
  const {
    drawControl,
    setSelectedFeatureId,
    updateFeatures,
  } = useMapAnnotationContext();
  // does not trigger a react rerender
  const updateFeatureProperty = React.useCallback<UpdateFeaturePropery>(
    (featureId, property, value) => {
      drawControl.setFeatureProperty(featureId, property, value);
    },
    [drawControl],
  );

  const deleteFeature = React.useCallback<DeleteFeature>(
    async (featureId: ?FeatureId) => {
      drawControl.delete(featureId);
      setSelectedFeatureId(curr => {
        if (typeof curr === 'string' && curr === featureId) {
          return null;
        }
        return curr;
      });
      await updateFeatures(drawControl.getAll());
    },
    [drawControl, updateFeatures, setSelectedFeatureId],
  );

  return {
    updateFeatureProperty,
    deleteFeature,
  };
}

function useDrawControl() {
  const drawControl = React.useMemo(() => {
    const overriddenStyles = overrideStyles([...MAPBOX_DRAW_DEFAULT_STYLES]);
    return new MapboxDraw({
      userProperties: true,
      styles: [...overriddenStyles, ...TG_DRAW_STYLES],
    });
  }, []);

  return drawControl;
}

function overrideStyles(
  styles: Array<{id: string, paint: Object, layout: Object}>,
) {
  const lookup = styles.reduce(
    (map, style) => Object.assign(map, {[style.id]: style}),
    {},
  );

  /**
   * The theme to override is here
   * https://github.com/mapbox/mapbox-gl-draw/blob/main/src/lib/theme.js
   */

  // polygons
  mutateStyle(
    lookup,
    MAPBOX_DRAW_DEFAULT_STYLE_IDS.POLYGON_FILL_INACTIVE,
    orig => ({
      paint: {
        ...orig.paint,
        'fill-color': getPropertyExp('color', MAPBOX_DRAW_DEFAULT_COLOR),
      },
    }),
  );
  mutateStyle(
    lookup,
    MAPBOX_DRAW_DEFAULT_STYLE_IDS.POLYGON_FILL_ACTIVE,
    orig => ({
      paint: {
        ...orig.paint,
        'fill-color': getPropertyExp('color', MAPBOX_DRAW_DEFAULT_COLOR),
      },
    }),
  );
  mutateStyle(
    lookup,
    MAPBOX_DRAW_DEFAULT_STYLE_IDS.POLYGON_STROKE_INACTIVE,
    orig => ({
      paint: {
        ...orig.paint,
        'line-color': getPropertyExp('color', MAPBOX_DRAW_DEFAULT_COLOR),
      },
    }),
  );
  mutateStyle(
    lookup,
    MAPBOX_DRAW_DEFAULT_STYLE_IDS.POLYGON_STROKE_ACTIVE,
    orig => ({
      paint: {
        ...orig.paint,
        'line-color': getPropertyExp('color', MAPBOX_DRAW_DEFAULT_COLOR),
      },
    }),
  );

  // Line strings
  mutateStyle(lookup, MAPBOX_DRAW_DEFAULT_STYLE_IDS.LINE_ACTIVE, orig => ({
    paint: {
      ...orig.paint,
      'line-color': getPropertyExp('color', MAPBOX_DRAW_DEFAULT_COLOR),
    },
  }));
  mutateStyle(lookup, MAPBOX_DRAW_DEFAULT_STYLE_IDS.LINE_INACTIVE, orig => ({
    paint: {
      ...orig.paint,
      'line-color': getPropertyExp('color', MAPBOX_DRAW_DEFAULT_COLOR),
    },
  }));

  // Points
  mutateStyle(lookup, MAPBOX_DRAW_DEFAULT_STYLE_IDS.POINT_INACTIVE, orig => ({
    paint: {
      ...orig.paint,
      'circle-color': getPropertyExp('color', MAPBOX_DRAW_DEFAULT_COLOR),
    },
  }));
  mutateStyle(lookup, MAPBOX_DRAW_DEFAULT_STYLE_IDS.POINT_ACTIVE, orig => ({
    paint: {
      ...orig.paint,
      'circle-color': getPropertyExp('color', MAPBOX_DRAW_DEFAULT_COLOR),
    },
  }));

  mutateStyle(lookup, MAPBOX_DRAW_DEFAULT_STYLE_IDS.VERTEX_INACTIVE, orig => ({
    paint: {
      ...orig.paint,
      'circle-color': MAPBOX_DRAW_VERTEX_COLOR,
    },
  }));

  return styles;
}

function mutateStyle(map, key, transform) {
  Object.assign(map[key], transform(map[key]));
}

function getPropertyExp(property, fallback) {
  // gl-draw prefixes user_ to user-defined feature properties
  const drawProp = `user_${property}`;
  return ['case', ['has', drawProp], ['get', drawProp], fallback];
}

export default context;
