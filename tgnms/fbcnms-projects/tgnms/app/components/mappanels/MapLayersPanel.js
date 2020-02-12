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
import MapHistoryOverlayPanel from './MapHistoryOverlayPanel';
import MapOverlayLegend from './MapOverlayLegend';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import Select from '@material-ui/core/Select';
import Switch from '@material-ui/core/Switch';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import {isFeatureEnabled} from '../../constants/FeatureFlags';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';
import {overlayLayers} from '../../constants/LayerConstants';
import {withStyles} from '@material-ui/core/styles';

import type {
  OverlayConfig,
  OverlaysConfig,
  SelectedLayersType,
  SelectedOverlays,
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

export type Props = {
  selectedLayers: SelectedLayersType,
  onLayerSelectChange: SelectedLayersType => any,
  // overlays
  overlaysConfig: OverlaysConfig,
  overlayLoading: boolean,
  selectedOverlays: SelectedOverlays,
  onOverlaySelectChange: SelectedOverlays => any,
  // map styles
  selectedMapStyle: string,
  mapStylesConfig: Array<{endpoint: string, name: string}>,
  onMapStyleSelectChange: string => any,
  onHistoricalTimeChange: number => void,
  onHistoricalDateChange: Date => void,
  setIsHistoricalOverlay: boolean => void,
  isHistoricalOverlay: boolean,
  historicalDate: Date,
  selectedTime: Date,
  // TODO extract to customexpansionpanel
  expanded: boolean,
  onPanelChange: () => any,
};

class MapLayersPanel extends React.Component<
  Props & {classes: {[string]: string}},
> {
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
    const {classes, selectedLayers} = this.props;
    return (
      <FormGroup key="layers" row={false} className={classes.formGroup}>
        <FormLabel component="legend">Layers</FormLabel>
        {overlayLayers.map(({layerId, name}) => (
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
    this.props.setIsHistoricalOverlay(value);
  };

  renderOverlays() {
    const {
      classes,
      isHistoricalOverlay,
      overlaysConfig,
      selectedOverlays,
      onHistoricalTimeChange,
      onHistoricalDateChange,
      onOverlaySelectChange,
      historicalDate,
      overlayLoading,
      selectedTime,
    } = this.props;
    return isFeatureEnabled('MAP_HISTORY_ENABLED') ? (
      <div className={classes.formContainer}>
        <Tabs
          value={isHistoricalOverlay}
          onChange={this.handleTableChange}
          classes={{
            root: classes.tabsRoot,
            indicator: classes.tabsIndicator,
          }}>
          <Tab
            classes={{root: classes.tabRoot, selected: classes.tabSelected}}
            disableRipple
            label="Current"
            value={false}
          />
          <Tab
            classes={{root: classes.tabRoot, selected: classes.tabSelected}}
            disableRipple
            label="History"
            value={true}
          />
        </Tabs>
        <div className={classes.sectionPadding} />

        {isHistoricalOverlay ? (
          <MapHistoryOverlayPanel
            overlaysConfig={overlaysConfig}
            selectedOverlays={selectedOverlays}
            onHistoricalTimeChange={onHistoricalTimeChange}
            onHistoricalDateChange={onHistoricalDateChange}
            onOverlaySelectChange={onOverlaySelectChange}
            date={historicalDate}
            overlayLoading={overlayLoading}
            selectedTime={selectedTime}
          />
        ) : (
          <div>
            {this.renderOverlaysForm()}
            {this.renderMapStylesForm()}
          </div>
        )}
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
      overlayLoading,
    } = this.props;
    return objectValuesTypesafe<OverlayConfig>(overlaysConfig).map(
      layerOverlays => {
        const layerId = layerOverlays.layerId;
        const overlays = layerOverlays.overlays;
        const legendName = overlayLayers.find(
          layer => layer.layerId === layerId,
        )?.name;

        // map overlay id -> type to render legend keys
        const overlay = layerOverlays.overlays.find(
          overlay => overlay.id === selectedOverlays[layerId],
        );
        return (
          <FormGroup row={false} key={layerId} className={classes.formGroup}>
            <FormLabel component="legend">
              <span>{legendName} Overlay</span>
              {overlayLoading && (
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
      },
    );
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
