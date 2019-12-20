/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CircularProgress from '@material-ui/core/CircularProgress';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import MapHistoryOverlay from './MapHistoryOverlay';
import MapOverlayLegend from './MapOverlayLegend';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import Select from '@material-ui/core/Select';
import Switch from '@material-ui/core/Switch';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import {isFeatureEnabled} from '../../constants/FeatureFlags';
import {withStyles} from '@material-ui/core/styles';

import type {Props as MapHistoryProps} from './MapHistoryOverlay';
import type {
  MapLayerConfig,
  OverlayConfig,
} from '../../views/map/NetworkMapTypes';

const styles = theme => ({
  formContainer: {
    flexDirection: 'column',
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
    marginBottom: theme.spacing(),
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
    '&$tabSelected': {
      color: '#1890ff',
      fontWeight: theme.typography.fontWeightMedium,
    },
    '&:focus': {
      color: '#40a9ff',
    },
  },
});

const OVERLAY_TYPE = Object.freeze({
  current: 'current',
  history: 'history',
});

export type Props = {
  selectedLayers: SelectedLayers,
  onLayerSelectChange: SelectedLayers => {},
  layersConfig: Array<MapLayerConfig>,
  // overlays
  overlaysConfig: Array<OverlayConfig<any>>,
  overlayLoading: {
    [string]: boolean,
  },
  selectedOverlays: SelectedOverlays,
  onOverlaySelectChange: SelectedOverlays => {},
  // map styles
  selectedMapStyle: string,
  mapStylesConfig: Array<{endpoint: string, name: string}>,
  onMapStyleSelectChange: string => any,

  // TODO extract to customexpansionpanel
  expanded: boolean,
  onPanelChange: () => any,
  mapHistoryProps: MapHistoryProps,
  networkName: string,
};

type SelectedOverlays = {[string]: string};
type SelectedLayers = {[string]: boolean};

type State = {
  selectedTable: string,
};

class MapLayersPanel extends React.Component<
  Props & {classes: {[string]: string}},
  State,
> {
  state = {
    selectedTable: OVERLAY_TYPE.current,
  };

  handleOverlaySelectionChange = layerId => event => {
    const {selectedOverlays, onOverlaySelectChange} = this.props;
    const overlayId = event.target.value;
    selectedOverlays[layerId] = overlayId;

    // invoke handler
    onOverlaySelectChange(selectedOverlays);
  };

  handleLayerSelectionChange = layerId => {
    const {selectedLayers, onLayerSelectChange} = this.props;
    selectedLayers[layerId] = !selectedLayers[layerId];

    // invoke handler
    onLayerSelectChange(selectedLayers);
  };

  renderLayersForm() {
    const {classes, layersConfig, selectedLayers} = this.props;
    return (
      <FormGroup key="layers" row={false} className={classes.formGroup}>
        <FormLabel component="legend">Layers</FormLabel>
        {layersConfig.map(({layerId, name}) => (
          <FormControlLabel
            key={layerId}
            control={
              <Switch
                color="primary"
                checked={selectedLayers[layerId]}
                onChange={_evt => this.handleLayerSelectionChange(layerId)}
                value={layerId}
              />
            }
            label={name}
          />
        ))}
      </FormGroup>
    );
  }

  handleTableChange = (_event, value) => {
    this.setState({selectedTable: value});
    this.props.mapHistoryProps.onUpdateMap({
      linkOverlayData: null,
      overlay: null,
      siteOverlayData: null,
    });
  };

  renderOverlays() {
    const {classes, mapHistoryProps, networkName} = this.props;
    const {selectedTable} = this.state;
    return isFeatureEnabled('MAP_HISTORY_ENABLED') ? (
      <div className={classes.formContainer}>
        <Tabs
          value={selectedTable}
          onChange={this.handleTableChange}
          classes={{
            root: classes.tabsRoot,
            indicator: classes.tabsIndicator,
          }}>
          <Tab
            classes={{root: classes.tabRoot, selected: classes.tabSelected}}
            disableRipple
            label="Current"
            value={OVERLAY_TYPE.current}
          />
          <Tab
            classes={{root: classes.tabRoot, selected: classes.tabSelected}}
            disableRipple
            label="History"
            value={OVERLAY_TYPE.history}
          />
        </Tabs>
        <div className={classes.sectionPadding} />

        {selectedTable === OVERLAY_TYPE.history ? (
          <MapHistoryOverlay {...mapHistoryProps} networkName={networkName} />
        ) : selectedTable === OVERLAY_TYPE.current ? (
          <div>
            {this.renderOverlaysForm()}
            {this.renderMapStylesForm()}
          </div>
        ) : null}
      </div>
    ) : (
      <div>
        {this.renderOverlaysForm()}
        {this.renderMapStylesForm()}
      </div>
    );
  }

  renderOverlaysForm() {
    const {
      classes,
      overlaysConfig,
      selectedOverlays,
      layersConfig,
      overlayLoading,
    } = this.props;
    return overlaysConfig.map(layerOverlays => {
      const layerId = layerOverlays.layerId;
      const overlays = layerOverlays.overlays;
      const legendName = layersConfig.find(layer => layer.layerId === layerId)
        ?.name;

      // map overlay id -> type to render legend keys
      const overlay = layerOverlays.overlays.find(
        overlay => overlay.id === selectedOverlays[layerId],
      );
      return (
        <FormGroup row={false} key={layerId} className={classes.formGroup}>
          <FormLabel component="legend">
            <span>{legendName} Overlay</span>
            {overlayLoading.hasOwnProperty(layerId) && (
              <CircularProgress
                className={classes.loadingIndicator}
                size={16}
              />
            )}
          </FormLabel>
          <Select
            value={selectedOverlays[layerId]}
            key={layerId}
            className={classes.select}
            onChange={this.handleOverlaySelectionChange(layerId)}>
            {overlays.map(overlay => {
              return (
                <MenuItem key={overlay.id} value={overlay.id}>
                  {overlay.name}
                </MenuItem>
              );
            })}
          </Select>
          <MapOverlayLegend overlay={overlay} layerOverlays={layerOverlays} />
        </FormGroup>
      );
    });
  }

  renderMapStylesForm() {
    const {
      classes,
      mapStylesConfig,
      selectedMapStyle,
      onMapStyleSelectChange,
    } = this.props;
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

  renderForms() {
    const {classes} = this.props;
    return (
      <div className={classes.formContainer}>
        {this.renderLayersForm()}
        {this.renderOverlays()}
      </div>
    );
  }

  render() {
    const {expanded, onPanelChange} = this.props;
    return (
      <CustomExpansionPanel
        title="Map Layers"
        details={this.renderForms()}
        expanded={expanded}
        onChange={onPanelChange}
      />
    );
  }
}

export default withStyles(styles)(MapLayersPanel);
