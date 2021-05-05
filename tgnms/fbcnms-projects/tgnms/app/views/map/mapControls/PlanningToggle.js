/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import CloseIcon from '@material-ui/icons/Close';
import MapboxControl from '@fbcnms/tg-nms/app/views/map/mapControls/MapboxControl';
import TerrainIcon from '@material-ui/icons/Terrain';
import {MAP_CONTROL_LOCATIONS} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {makeStyles} from '@material-ui/styles';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';

const useStyles = makeStyles(() => ({
  icon: {
    fontSize: '1rem',
  },
}));

export default function PlanningToggle() {
  const classes = useStyles();
  const [planEnabled, setPlanEnabled] = React.useState(false);
  const {selectedPlanId, setSelectedPlanId} = useNetworkPlanningContext();

  React.useEffect(() => {
    if (selectedPlanId == null) {
      setPlanEnabled(false);
    }
  }, [selectedPlanId]);

  const handlePlanClicked = React.useCallback(() => {
    if (planEnabled) {
      setSelectedPlanId(null);
    } else {
      setSelectedPlanId('');
    }

    setPlanEnabled(!planEnabled);
  }, [setSelectedPlanId, planEnabled]);

  return (
    <MapboxControl
      mapLocation={MAP_CONTROL_LOCATIONS.TOP_LEFT}
      data-testid="tg-plan-toggle-container">
      <button
        style={
          !planEnabled
            ? {
                backgroundColor: '#424242',
                color: 'white',
              }
            : undefined
        }
        title="Network Planning"
        onClick={handlePlanClicked}
        data-testid="tg-plan-toggle">
        {planEnabled ? (
          <CloseIcon data-testid="close-plan" className={classes.icon} />
        ) : (
          <TerrainIcon data-testid="open-plan" className={classes.icon} />
        )}
      </button>
    </MapboxControl>
  );
}
