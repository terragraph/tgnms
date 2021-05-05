/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AddLocationIcon from '@material-ui/icons/AddLocation';
import CloseIcon from '@material-ui/icons/Close';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import PublishIcon from '@material-ui/icons/Publish';
import ReactDOM from 'react-dom';
import RouterIcon from '@material-ui/icons/Router';
import TuneIcon from '@material-ui/icons/Tune';
import {MAP_CONTROL_LOCATIONS} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {
  TOPOLOGY_PANEL_OPTIONS,
  useTopologyBuilderContext,
} from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/TopologyBuilderContext';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

const useStyles = makeStyles(() => ({
  icon: {
    fontSize: '1rem',
  },
}));

export default function TopologyBuilderLayer() {
  const classes = useStyles();
  const {
    selectedTopologyPanel,
    setSelectedTopologyPanel,
  } = useTopologyBuilderContext();
  const {mapboxRef} = useMapContext();
  const [topologyEnabled, setTopologyEnabled] = React.useState(false);

  const mapboxControl = React.useMemo(() => {
    const container = document.createElement('div');
    container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    container.setAttribute('data-testid', 'tg-topology-toggle-container');
    return container;
  }, []);

  React.useEffect(() => {
    if (selectedTopologyPanel === null) {
      setTopologyEnabled(false);
    }
  }, [selectedTopologyPanel, setTopologyEnabled]);

  React.useEffect(() => {
    if (!topologyEnabled) {
      setSelectedTopologyPanel(null);
    }
  }, [setSelectedTopologyPanel, topologyEnabled]);

  const handleSelectTopologyPanel = React.useCallback(
    (selectedPanel: $Values<typeof TOPOLOGY_PANEL_OPTIONS>) => {
      if (selectedTopologyPanel !== selectedPanel) {
        setSelectedTopologyPanel(selectedPanel);
      } else {
        setSelectedTopologyPanel(null);
      }
    },
    [selectedTopologyPanel, setSelectedTopologyPanel],
  );

  React.useEffect(() => {
    mapboxRef?.addControl(
      {
        onAdd: _map => {
          return mapboxControl;
        },
        onRemove: () => {},
      },
      MAP_CONTROL_LOCATIONS.TOP_LEFT,
    );
  }, [mapboxRef, mapboxControl]);

  return ReactDOM.createPortal(
    <>
      <button
        style={
          !topologyEnabled
            ? {
                backgroundColor: '#424242',
                color: 'white',
              }
            : undefined
        }
        title="Add Topology"
        onClick={() => setTopologyEnabled(!topologyEnabled)}
        data-testid="tg-topology-toggle">
        {topologyEnabled ? (
          <CloseIcon className={classes.icon} />
        ) : (
          <RouterIcon className={classes.icon} />
        )}
      </button>
      {topologyEnabled && (
        <>
          <button
            title="Add node"
            onClick={() =>
              handleSelectTopologyPanel(TOPOLOGY_PANEL_OPTIONS.NODE)
            }>
            <RouterIcon className={classes.icon} />
          </button>
          <button
            title="Add link"
            onClick={() =>
              handleSelectTopologyPanel(TOPOLOGY_PANEL_OPTIONS.LINK)
            }>
            <CompareArrowsIcon className={classes.icon} />
          </button>
          <button
            title="Add planned site"
            onClick={() =>
              handleSelectTopologyPanel(TOPOLOGY_PANEL_OPTIONS.SITE)
            }>
            <AddLocationIcon className={classes.icon} />
          </button>
          {isFeatureEnabled('L2_TUNNELS_ENABLED') && (
            <button
              title="Add L2 tunnel"
              onClick={() =>
                handleSelectTopologyPanel(TOPOLOGY_PANEL_OPTIONS.L2_TUNNEL)
              }>
              <TuneIcon className={classes.icon} />
            </button>
          )}
          <button
            title="Upload topology file"
            onClick={() =>
              handleSelectTopologyPanel(TOPOLOGY_PANEL_OPTIONS.UPLOAD)
            }>
            <PublishIcon className={classes.icon} />
          </button>
        </>
      )}
    </>,
    mapboxControl,
  );
}
