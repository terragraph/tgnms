/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as mapApiUtil from '@fbcnms/tg-nms/app/apiutils/MapAPIUtil';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {
  MAPBOX_DRAW_DEFAULT_COLOR,
  MAPBOX_DRAW_DEFAULT_STYLES,
  MAPBOX_DRAW_DEFAULT_STYLE_IDS,
  MAPBOX_DRAW_EVENTS,
  MAPBOX_DRAW_VERTEX_COLOR,
  TG_DRAW_STYLES,
} from '@fbcnms/tg-nms/app/constants/MapAnnotationConstants';
import {useMapContext} from './MapContext';
import {useNetworkContext} from './NetworkContext';
import type {FeatureId, GeoFeature} from '@turf/turf';
import type {
  MapAnnotationGroup,
  MapAnnotationGroupIdent,
} from '@fbcnms/tg-nms/shared/dto/MapAnnotations';

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
  deselectAll: () => void,
|};

const empty = () => {};
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
  const taskStateRef = useLiveRef(taskState);
  const loadGroup = React.useCallback(
    async ({name}: {name: string}): Promise<?MapAnnotationGroup> => {
      try {
        taskStateRef.current.setState(TASK_STATE.LOADING);
        const group = await mapApiUtil.getAnnotationGroup({
          networkName,
          groupName: name,
        });
        if (!group) {
          throw new Error(`Group: ${name} not found`);
        }
        setCurrent(group);
        drawControl.set(group.geojson);
        taskStateRef.current.setState(TASK_STATE.SUCCESS);
        return group;
      } catch (err) {
        taskStateRef.current.setState(TASK_STATE.ERROR);
        taskStateRef.current.setMessage(err?.message ?? 'Error');
        return null;
      }
    },
    [taskStateRef, setCurrent, drawControl, networkName],
  );

  const loadGroups = React.useCallback(async () => {
    try {
      taskStateRef.current.setState(TASK_STATE.LOADING);
      const _groups = await mapApiUtil.getAnnotationGroups({networkName});
      if (_groups) {
        setGroups(_groups);
      }
      taskStateRef.current.setState(TASK_STATE.SUCCESS);
    } catch (err) {
      taskStateRef.current.setState(TASK_STATE.ERROR);
    }
  }, [taskStateRef, networkName, setGroups]);

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
type UpdateFeature = {
  (GeoFeature): Promise<GeoFeature>,
};
export function useAnnotationFeatures(): {
  updateFeatureProperty: UpdateFeaturePropery,
  deleteFeature: DeleteFeature,
  updateFeature: UpdateFeature,
} {
  const {networkName} = useNetworkContext();
  const {
    drawControl,
    setSelectedFeatureId,
    current,
  } = useMapAnnotationContext();
  const groupName = current?.name;
  // does not trigger a react rerender
  const updateFeatureProperty = React.useCallback<UpdateFeaturePropery>(
    (featureId, property, value) => {
      drawControl.setFeatureProperty(featureId, property, value);
    },
    [drawControl],
  );

  const updateFeature = React.useCallback(
    async (feature: GeoFeature) => {
      return mapApiUtil.saveAnnotation({
        networkName: networkName,
        groupName: groupName ?? '',
        annotationId: feature.id ?? '',
        annotation: feature,
      });
    },
    [networkName, groupName],
  );
  const deleteFeature = React.useCallback<DeleteFeature>(
    async (featureId: ?FeatureId) => {
      if (drawControl.get(featureId)) {
        drawControl.delete(featureId);
      }
      setSelectedFeatureId(curr => {
        if (typeof curr === 'string' && curr === featureId) {
          return null;
        }
        return curr;
      });
      if (featureId == null || groupName == null) {
        return;
      }
      await mapApiUtil.deleteAnnotation({
        networkName: networkName,
        groupName: groupName,
        annotationId: featureId,
      });
    },
    [drawControl, groupName, networkName, setSelectedFeatureId],
  );

  return {
    updateFeatureProperty,
    deleteFeature,
    updateFeature,
  };
}

type MapboxDrawEvent = {|
  type: string,
  features: Array<GeoFeature>,
|};
export function useDrawState() {
  const {mapboxRef} = useMapContext();
  const {setSelectedFeatureId} = useMapAnnotationContext();
  const {deleteFeature, updateFeature} = useAnnotationFeatures();
  const handleFeaturesDeleted = (features: Array<GeoFeature>) => {
    for (const feat of features) {
      deleteFeature(feat.id);
    }
  };
  const handleFeaturesUpdated = (features: Array<GeoFeature>) => {
    for (const feat of features) {
      updateFeature(feat);
    }
  };
  const handleSelectionChanged = (features: Array<GeoFeature>) => {
    if (!features) {
      return;
    }
    const [lastSelected] = features.slice(-1);
    setSelectedFeatureId(lastSelected?.id);
  };

  const handleDrawUpdate = useLiveRef((update: MapboxDrawEvent) => {
    switch (update.type) {
      case MAPBOX_DRAW_EVENTS.CREATE:
      case MAPBOX_DRAW_EVENTS.UPDATE:
        return handleFeaturesUpdated(update.features);
      case MAPBOX_DRAW_EVENTS.DELETE:
        return handleFeaturesDeleted(update.features);
      case MAPBOX_DRAW_EVENTS.SELECTION_CHANGE:
        return handleSelectionChanged(update.features);
    }
  });
  React.useEffect(() => {
    if (mapboxRef) {
      const events = [
        MAPBOX_DRAW_EVENTS.CREATE,
        MAPBOX_DRAW_EVENTS.UPDATE,
        MAPBOX_DRAW_EVENTS.DELETE,
        MAPBOX_DRAW_EVENTS.SELECTION_CHANGE,
      ];
      const handleDrawEvent = (event: MapboxDrawEvent) =>
        handleDrawUpdate.current(event);
      for (const event of events) {
        /**
         * mapbox doesn't explicitly support arbitrary strings on the on method,
         * but its the only way to get events from mapbox-gl-draw. We'll update
         * when they do.
         */
        // $FlowIgnore
        mapboxRef.on(event, handleDrawEvent);
      }
      return () => {
        for (const event of events) {
          // $FlowIgnore
          mapboxRef.off(event, handleDrawEvent);
        }
      };
    }
  }, [handleDrawUpdate, mapboxRef]);

  return {};
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
  return [
    'case',
    ['all', ['has', drawProp], ['to-boolean', ['get', drawProp]]],
    ['get', drawProp],
    fallback,
  ];
}

export default context;
