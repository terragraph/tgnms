/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CircularProgress from '@material-ui/core/CircularProgress';
import CustomAccordion from '../common/CustomAccordion';
import DefaultOverlayPanel from './overlayPanels/DefaultOverlayPanel';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import MapHistoryOverlayPanel from './overlayPanels/MapHistoryOverlayPanel';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkTestOverlayPanel from './overlayPanels/NetworkTestOverlayPanel';
import React from 'react';
import ScanServiceOverlayPanel from './overlayPanels/ScanServiceOverlayPanel';
import Select from '@material-ui/core/Select';
import Switch from '@material-ui/core/Switch';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import {MAPMODE, useMapContext} from '../../contexts/MapContext';
import {isFeatureEnabled} from '../../constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {mapLayers} from '../../constants/LayerConstants';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';

import type {OverlayConfig} from '../../views/map/NetworkMapTypes';

const styles = theme => ({
  formContainer: {
    flexDirection: 'column',
    width: '100%',
  },
  select: {
    marginBottom: theme.spacing(1),
  },
  loadingIndicator: {
    marginLeft: theme.spacing(1),
    marginTop: -4,
  },
  formGroup: {
    marginBottom: theme.spacing(2),
  },
  root: {
    display: 'flex',
    height: '100%',
    flexGrow: 1,
    flexFlow: 'column',
    overflow: 'hidden',
  },
  tabsRoot: {
    borderBottom: '1px solid #e8e8e8',
    flex: '0 1 auto',
    marginBottom: theme.spacing(2),
    paddingTop: theme.spacing(),
    paddingLeft: theme.spacing(),
  },
  tabsIndicator: {
    backgroundColor: '#1890ff',
  },
  tabRoot: {
    width: '50%',
    textTransform: 'initial',
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
  const classes = useStyles();
  return (
    <CustomAccordion
      title="Map Layers"
      data-testid="map-layers-panel"
      details={
        <div className={classes.formContainer}>
          <LayersForm />
          <OverlaySection />
          <MapStylesForm
            selectedMapStyle={selectedMapStyle}
            mapStylesConfig={mapStylesConfig}
            onMapStyleSelectChange={onMapStyleSelectChange}
          />
        </div>
      }
      expanded={expanded}
      onChange={onPanelChange}
    />
  );
}

function OverlaySection() {
  const classes = useStyles();
  const {mapMode, setMapMode} = useMapContext();
  const handleTabChange = React.useCallback(
    (_event, value) => {
      setMapMode(value);
    },
    [setMapMode],
  );

  return (
    <div className={classes.formContainer}>
      {isFeatureEnabled('MAP_HISTORY_ENABLED') &&
        mapMode !== MAPMODE.NETWORK_TEST &&
        mapMode !== MAPMODE.SCAN_SERVICE && (
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
            </Tabs>
          </>
        )}
      <div>
        {mapMode === MAPMODE.DEFAULT && <DefaultOverlayPanel />}
        {mapMode === MAPMODE.HISTORICAL && <MapHistoryOverlayPanel />}
        {mapMode === MAPMODE.NETWORK_TEST && <NetworkTestOverlayPanel />}
        {mapMode === MAPMODE.SCAN_SERVICE && <ScanServiceOverlayPanel />}
        <div>
          <OverlaysForm />
        </div>
      </div>
    </div>
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
    marginLeft: theme.spacing(1),
    marginTop: -4,
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
      const legendName = mapLayers.find(layer => layer.layerId === layerId)
        ?.name;

      if (overlays.length < 2) {
        return null;
      }
      return (
        <FormGroup row={false} key={layerId} className={classes.formGroup}>
          <FormLabel component="legend">
            <span>{legendName} Overlay</span>
            {isOverlayLoading && (
              <CircularProgress
                className={classes.loadingIndicator}
                size={16}
              />
            )}
          </FormLabel>
          <Select
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
          </Select>
        </FormGroup>
      );
    },
  );
}

type MapStylesFormProps = {|
  selectedMapStyle: string,
  mapStylesConfig: Array<{endpoint: string, name: string}>,
  onMapStyleSelectChange: string => any,
|};
function MapStylesForm({
  mapStylesConfig,
  selectedMapStyle,
  onMapStyleSelectChange,
}: MapStylesFormProps) {
  const classes = useStyles();

  return (
    <FormGroup row={false} className={classes.formGroup}>
      <FormLabel component="legend">Map Style</FormLabel>
      <Select
        value={selectedMapStyle}
        className={classes.select}
        onChange={event => onMapStyleSelectChange(event.target.value)}>
        {mapStylesConfig.map(({endpoint, name}) => (
          <MenuItem key={endpoint} value={endpoint}>
            {name}
          </MenuItem>
        ))}
      </Select>
    </FormGroup>
  );
}
