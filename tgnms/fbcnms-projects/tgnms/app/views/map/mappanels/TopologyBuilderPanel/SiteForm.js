/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import ShowAdvanced from '@fbcnms/tg-nms/app/components/common/ShowAdvanced';
import SiteAdvanced from '@fbcnms/tg-nms/app/views/map/mappanels/TopologyBuilderPanel/SiteAdvanced';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import {defaultLocation} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {usePlannedSiteContext} from '@fbcnms/tg-nms/app/contexts/PlannedSiteContext';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';

export default function SiteForm() {
  const {setLocation, plannedSite} = usePlannedSiteContext();
  const {
    initialParams,
    updateTopology,
    selectedTopologyPanel,
  } = useTopologyBuilderContext();
  const updateTopologyRef = useLiveRef(updateTopology);
  const {site} = initialParams;
  const {mapboxRef, setIsSiteHidden} = useMapContext();

  const {formState, handleInputChange, updateFormState} = useForm({
    initialState: {
      name: site?.name ?? 'site_' + Date.now(),
      location: defaultLocation,
    },
  });
  const updateFormStateRef = useLiveRef(updateFormState);
  const formStateRef = useLiveRef(formState);

  React.useEffect(() => {
    // Add a planned site to the map
    // Set initial position to the center of the map, or the provided location
    let initialPosition = {latitude: 0, longitude: 0};
    if (site && site.location) {
      const {latitude, longitude} = site.location;
      initialPosition = {latitude, longitude};
      //hide current site
      setIsSiteHidden(site.name, true);
    } else if (mapboxRef) {
      const {lat, lng} = mapboxRef.getCenter();
      initialPosition = {latitude: lat, longitude: lng};
    }
    if (selectedTopologyPanel !== null) {
      setLocation(initialPosition);
    }

    //unhide site when returned
    return () => {
      if (site) {
        setIsSiteHidden(site.name, false);
      }
    };
  }, [mapboxRef, setLocation, site, setIsSiteHidden, selectedTopologyPanel]);

  React.useEffect(() => {
    updateTopologyRef.current({site: formState});
  }, [formState, updateTopologyRef]);

  const handleLocationChange = React.useCallback(
    update => {
      const newLocation = {...formState.location, ...update};
      updateFormStateRef.current({location: newLocation});
      setLocation(newLocation);
    },
    [formState, setLocation, updateFormStateRef],
  );

  React.useEffect(() => {
    const newLocation = {...formStateRef.current.location, ...plannedSite};
    updateFormStateRef.current({location: newLocation});
  }, [plannedSite, updateFormStateRef, formStateRef]);

  return (
    <Grid container direction="column" spacing={2}>
      <Grid item>
        <Typography variant="subtitle2" color="textSecondary">
          Site Location
        </Typography>
        <Typography>
          Drag and drop the white circle on the map to change the site location.
        </Typography>
      </Grid>
      <Grid item>
        <TextField
          className="site-name-tutorial"
          data-testId="site-name-input"
          id="name"
          key="name"
          label="Site Name"
          InputLabelProps={{shrink: true}}
          margin="dense"
          fullWidth
          value={formState.name}
          onChange={handleInputChange(val => ({name: val}))}
        />
      </Grid>
      <Grid item>
        <ShowAdvanced>
          <SiteAdvanced
            onChange={handleLocationChange}
            location={formState.location}
          />
        </ShowAdvanced>
      </Grid>
    </Grid>
  );
}
