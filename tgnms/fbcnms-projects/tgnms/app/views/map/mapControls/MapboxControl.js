/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import {MAP_CONTROL_LOCATIONS} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

const useStyles = makeStyles(theme => ({
  container: {
    '&:not(:empty)': {
      boxShadow: theme.shadows[6],
    },
  },
}));

type Props = {
  mapLocation: $Values<typeof MAP_CONTROL_LOCATIONS>,
  children: React.Node,
  'data-testid'?: string,
};

export default function MapboxControl(props: Props) {
  const classes = useStyles();
  const {mapLocation, children} = props;
  const {mapboxRef} = useMapContext();
  const testId = props['data-testid'];

  const mapboxControl = React.useMemo(() => {
    const container = document.createElement('div');
    container.className = `mapboxgl-ctrl mapboxgl-ctrl-group ${classes.container}`;
    container.setAttribute('data-testid', testId);
    return container;
  }, [testId, classes.container]);

  useOnceInitialized(() => {
    mapboxRef?.addControl(
      {
        onAdd: _map => {
          return mapboxControl;
        },
        onRemove: () => {},
      },
      mapLocation,
    );
  }, [mapboxRef]);

  return ReactDOM.createPortal(children, mapboxControl);
}

export function useOnceInitialized(fn: () => void | any, deps: Array<*>) {
  const fnRef = React.useRef(fn);
  React.useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  React.useEffect(
    () => {
      if (fnRef.current === null) {
        return;
      }
      // all deps have been initialized
      for (const d of deps) {
        if (typeof d === 'undefined' || d === null) {
          return;
        }
      }

      try {
        fnRef.current();
      } finally {
        fnRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );
}
