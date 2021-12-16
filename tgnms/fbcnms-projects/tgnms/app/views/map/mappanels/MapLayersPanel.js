/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CircularProgress from '@material-ui/core/CircularProgress';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import CustomOverlayPanel from './overlayPanels/CustomOverlayPanel';
import DefaultOverlayPanel from './overlayPanels/DefaultOverlayPanel';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import InputAdornment from '@material-ui/core/InputAdornment';
import MapHistoryOverlayPanel from './overlayPanels/MapHistoryOverlayPanel';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkPlanningOverlayPanel from './overlayPanels/NetworkPlanningOverlayPanel';
import NetworkTestOverlayPanel from './overlayPanels/NetworkTestOverlayPanel';
import React from 'react';
import ScanServiceOverlayPanel from './overlayPanels/ScanServiceOverlayPanel';
import Switch from '@material-ui/core/Switch';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import TextField from '@material-ui/core/TextField';
import {MAPMODE, useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {makeStyles} from '@material-ui/styles';
import {mapLayers} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useShowCustomOverlayPanel} from '@fbcnms/tg-nms/app/features/map/useMapProfile';

import type {OverlayConfig} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';

const styles = theme => ({
  formContainer: {
    flexDirection: 'column',
    width: '100%',
  },
  tabsRoot: {
    borderBottom: '1px solid #e8e8e8',
    marginBottom: theme.spacing(2),
    paddingTop: theme.spacing(),
    paddingLeft: 0,
  },
  tabsIndicator: {
    backgroundColor: '#1890ff',
  },
  tabRoot: {
    textTransform: 'initial',
    flex: 1,
    minWidth: 72,
    fontWeight: theme.typography.fontWeightRegular,
    fontSize: 16,
    '&:hover': {
      color: '#40a9ff',
      opacity: 1,
    },
    '&:focus': {
      color: '#40a9ff',
    },
  },
});

const useStyles = makeStyles(styles);

export type Props = {
  // map styles
  selectedMapStyle: string,
  mapStylesConfig: Array<{endpoint: string, name: string}>,
  onMapStyleSelectChange: string => any,
  expanded: boolean,
  onPanelChange: () => any,
};

export default function MapLayersPanel({
  expanded,
  onPanelChange,
  selectedMapStyle,
  mapStylesConfig,
  onMapStyleSelectChange,
}: Props) {
  return (
    <CustomAccordion
      title="Map Layers"
      data-testid="map-layers-panel"
      details={
        <Grid container direction="column" spacing={1}>
          <Grid item>
            <LayersForm />
          </Grid>
          <Grid item>
            <OverlaySection />
          </Grid>
          <Grid item>
            <MapStyleSelect
              selectedMapStyle={selectedMapStyle}
              mapStylesConfig={mapStylesConfig}
              onMapStyleSelectChange={onMapStyleSelectChange}
            />
          </Grid>
        </Grid>
      }
      expanded={expanded}
      onChange={onPanelChange}
    />
  );
}

/**
 * These are the main 3 mapmodes which render metrics for the network's
 * topology.
 */
const TABBED_MAPMODES = new Set([
  MAPMODE.DEFAULT,
  MAPMODE.HISTORICAL,
  MAPMODE.CUSTOM_OVERLAYS,
]);

function OverlaySection() {
  const classes = useStyles();
  const {mapMode, setMapMode} = useMapContext();
  const showCustomOverlaysTab = useShowCustomOverlayPanel();
  const handleTabChange = React.useCallback(
    (_event, value) => {
      setMapMode(value);
    },
    [setMapMode],
  );

  return (
    <Grid className={classes.formContainer} container direction="column">
      {TABBED_MAPMODES.has(mapMode) && (
        <>
          <Tabs
            value={mapMode}
            onChange={handleTabChange}
            classes={{
              root: classes.tabsRoot,
              indicator: classes.tabsIndicator,
            }}>
            <Tab
              classes={{root: classes.tabRoot}}
              disableRipple
              label="Current"
              value={MAPMODE.DEFAULT}
            />
            <Tab
              classes={{root: classes.tabRoot}}
              disableRipple
              label="Historical"
              value={MAPMODE.HISTORICAL}
            />
            {showCustomOverlaysTab && (
              <Tab
                classes={{root: classes.tabRoot}}
                disableRipple
                label="Custom"
                value={MAPMODE.CUSTOM_OVERLAYS}
              />
            )}
          </Tabs>
        </>
      )}
      <div>
        {mapMode === MAPMODE.DEFAULT && <DefaultOverlayPanel />}
        {mapMode === MAPMODE.HISTORICAL && <MapHistoryOverlayPanel />}
        {mapMode === MAPMODE.NETWORK_TEST && <NetworkTestOverlayPanel />}
        {mapMode === MAPMODE.SCAN_SERVICE && <ScanServiceOverlayPanel />}
        {mapMode === MAPMODE.CUSTOM_OVERLAYS && <CustomOverlayPanel />}
        {mapMode === MAPMODE.PLANNING && <NetworkPlanningOverlayPanel />}
        <Grid container direction="column" wrap="nowrap" spacing={1}>
          <OverlaysForm />
        </Grid>
      </div>
    </Grid>
  );
}

const useFormStyles = makeStyles(theme => ({
  formGroup: {
    marginBottom: theme.spacing(2),
  },
  select: {
    marginBottom: theme.spacing(1),
  },
  loadingIndicator: {
    marginRight: theme.spacing(3),
  },
}));
function LayersForm() {
  const {selectedLayers, setIsLayerSelected, overlaysConfig} = useMapContext();
  const classes = useFormStyles();

  return (
    <FormGroup key="layers" row={false} className={classes.formGroup}>
      <FormLabel component="legend">Layers</FormLabel>
      {mapLayers.map(({layerId, name, isStatic, toggleable}) => {
        // non-static overlays require an overlay config
        if ((!isStatic && !overlaysConfig[layerId]) || toggleable === false) {
          return null;
        }
        return (
          <FormControlLabel
            key={layerId}
            control={
              <Switch
                color="primary"
                checked={selectedLayers[layerId] || false}
                onChange={_evt =>
                  setIsLayerSelected(layerId, !selectedLayers[layerId])
                }
                value={layerId}
              />
            }
            label={name}
          />
        );
      })}
    </FormGroup>
  );
}

function OverlaysForm() {
  const classes = useFormStyles();
  const {
    overlaysConfig,
    selectedOverlays,
    setLayerOverlay,
    isOverlayLoading,
  } = useMapContext();

  return objectValuesTypesafe<OverlayConfig>(overlaysConfig).map(
    layerOverlays => {
      const layerId = layerOverlays.layerId;
      const overlays = layerOverlays.overlays;
      const legendName =
        mapLayers.find(layer => layer.layerId === layerId)?.name ?? '';

      if (overlays.length < 2) {
        return null;
      }
      return (
        <Grid item xs={12}>
          <TextField
            fullWidth
            label={`${legendName} Overlay`}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {isOverlayLoading && (
                    <CircularProgress
                      className={classes.loadingIndicator}
                      size={16}
                    />
                  )}
                </InputAdornment>
              ),
            }}
            select
            id={layerId}
            value={selectedOverlays[layerId] || ''}
            key={layerId}
            className={classes.select}
            onChange={e => setLayerOverlay(layerId, e.target.value)}>
            {overlays.map(overlay => {
              return (
                <MenuItem key={overlay.id} value={overlay.id}>
                  {overlay.name}
                </MenuItem>
              );
            })}
          </TextField>
        </Grid>
      );
    },
  );
}

type MapStyleProps = {|
  selectedMapStyle: string,
  mapStylesConfig: Array<{endpoint: string, name: string}>,
  onMapStyleSelectChange: string => any,
|};
function MapStyleSelect({
  mapStylesConfig,
  selectedMapStyle,
  onMapStyleSelectChange,
}: MapStyleProps) {
  return (
    <TextField
      fullWidth
      label="Map Style"
      select
      value={selectedMapStyle}
      onChange={event => onMapStyleSelectChange(event.target.value)}>
      {mapStylesConfig.map(({endpoint, name}) => (
        <MenuItem key={endpoint} value={endpoint}>
          {name}
        </MenuItem>
      ))}
    </TextField>
  );
}
