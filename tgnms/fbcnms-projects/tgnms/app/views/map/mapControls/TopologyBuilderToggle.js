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
import MapboxControl from '@fbcnms/tg-nms/app/views/map/mapControls/MapboxControl';
import PublishIcon from '@material-ui/icons/Publish';
import RouterIcon from '@material-ui/icons/Router';
import TuneIcon from '@material-ui/icons/Tune';
import {MAP_CONTROL_LOCATIONS} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {STEP_TARGET} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {
  TOPOLOGY_PANEL_OPTIONS,
  useTopologyBuilderContext,
} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {useTutorialContext} from '@fbcnms/tg-nms/app/contexts/TutorialContext';

const useStyles = makeStyles(() => ({
  icon: {
    fontSize: '1rem',
  },
  iconButton: {borderRadius: '4px'},
}));

export default function TopologyBuilderToggle() {
  const classes = useStyles();
  const {
    createSite,
    createNode,
    createLink,
    selectedTopologyPanel,
    setSelectedTopologyPanel,
  } = useTopologyBuilderContext();
  const {nextStep} = useTutorialContext();

  const [topologyEnabled, setTopologyEnabled] = React.useState(false);

  React.useEffect(() => {
    if (selectedTopologyPanel === null) {
      setTopologyEnabled(false);
    }
  }, [selectedTopologyPanel]);

  const handleSelectTopologyPanel = React.useCallback(
    (selectedPanel: $Values<typeof TOPOLOGY_PANEL_OPTIONS>) => {
      if (selectedTopologyPanel !== selectedPanel) {
        setSelectedTopologyPanel(selectedPanel);
      }
    },
    [selectedTopologyPanel, setSelectedTopologyPanel],
  );

  const handleToggleClick = React.useCallback(() => {
    setTopologyEnabled(!topologyEnabled);
    nextStep();
  }, [topologyEnabled, nextStep]);

  const handleSiteClick = React.useCallback(() => {
    createSite({});
    nextStep();
  }, [nextStep, createSite]);

  return (
    <MapboxControl
      mapLocation={MAP_CONTROL_LOCATIONS.TOP_LEFT}
      data-testid="tg-topology-toggle-container">
      <button
        className={`${STEP_TARGET.TOPOLOGY_TOOLBAR} ${classes.iconButton}`}
        style={
          !topologyEnabled
            ? {
                backgroundColor: '#424242',
                color: 'white',
              }
            : undefined
        }
        title="Add Topology"
        onClick={handleToggleClick}
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
            className={STEP_TARGET.ADD_SITE}
            title="Add planned site"
            onClick={handleSiteClick}>
            <AddLocationIcon className={classes.icon} />
          </button>
          <button title="Add node" onClick={createNode}>
            <RouterIcon className={classes.icon} />
          </button>
          <button title="Add link" onClick={createLink}>
            <CompareArrowsIcon className={classes.icon} />
          </button>
          {isFeatureEnabled('L2_TUNNELS_ENABLED') && (
            <button
              title="Add L2 tunnel"
              onClick={() => {
                handleSelectTopologyPanel(TOPOLOGY_PANEL_OPTIONS.L2_TUNNEL);
              }}>
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
    </MapboxControl>
  );
}
