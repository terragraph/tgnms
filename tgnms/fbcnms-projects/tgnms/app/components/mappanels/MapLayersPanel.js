/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Chip from '@material-ui/core/Chip';
import CircularProgress from '@material-ui/core/CircularProgress';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import MapLayersPanelConfigButton from './MapLayersPanelConfigButton';
import MenuItem from '@material-ui/core/MenuItem';
import PropTypes from 'prop-types';
import React from 'react';
import Select from '@material-ui/core/Select';
import Switch from '@material-ui/core/Switch';
import {METRIC_COLOR_RANGE} from '../../constants/LayerConstants';
import {has} from 'lodash';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  formContainer: {
    flexDirection: 'column',
  },
  chip: {
    height: 20,
  },
  chipLabel: {
    paddingLeft: theme.spacing.unit,
    paddingRight: theme.spacing.unit,
  },
  select: {
    marginBottom: theme.spacing.unit,
  },
  loadingIndicator: {
    marginLeft: theme.spacing.unit,
    marginTop: -4,
  },
  formGroup: {
    marginBottom: theme.spacing.unit * 2,
  },
});

class MapLayersPanel extends React.Component {
  state = {};

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

  renderLegend(legendConfig, overlay, changeOverlayRange) {
    const {classes} = this.props;
    const {range, units = ''} = overlay;
    return (
      <div>
        {Object.keys(legendConfig).map((element, idx) => {
          const elementColor = legendConfig[element].color;
          let labelName = element.replace('_', ' ');

          // Add range label
          if (
            range &&
            range.length === METRIC_COLOR_RANGE.length &&
            idx < range.length
          ) {
            if (range[METRIC_COLOR_RANGE.length - 1] > range[0]) {
              labelName += ` (<= ${range[idx]}${units})`;
            } else {
              labelName += ` (>= ${range[idx]}${units})`;
            }
          }

          return (
            <Chip
              key={element}
              label={labelName}
              className={classes.chip}
              classes={{label: classes.chipLabel}}
              style={{
                color: elementColor,
              }}
              variant="outlined"
            />
          );
        })}
        {range && range.length === METRIC_COLOR_RANGE.length && (
          <MapLayersPanelConfigButton
            changeOverlayRange={changeOverlayRange}
            legendConfig={legendConfig}
            overlay={overlay}
          />
        )}
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
      const changeOverlayRange = layerOverlays.changeOverlayRange;
      const legendName = layersConfig.find(layer => layer.layerId === layerId)
        .name;

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
          {overlay &&
            has(layerOverlays, ['legend', overlay.type]) &&
            this.renderLegend(
              layerOverlays.legend[overlay.type],
              overlay,
              changeOverlayRange,
            )}
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
        {this.renderOverlaysForm()}
        {this.renderMapStylesForm()}
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

MapLayersPanel.propTypes = {
  classes: PropTypes.object.isRequired,
  expanded: PropTypes.bool.isRequired,
  onPanelChange: PropTypes.func.isRequired,

  // Layer selection
  layersConfig: PropTypes.array.isRequired,
  selectedLayers: PropTypes.object.isRequired,
  onLayerSelectChange: PropTypes.func.isRequired,

  // Overlay selection
  overlaysConfig: PropTypes.array.isRequired,
  selectedOverlays: PropTypes.object.isRequired,
  onOverlaySelectChange: PropTypes.func.isRequired,
  overlayLoading: PropTypes.object.isRequired,

  // Map style selection
  mapStylesConfig: PropTypes.array.isRequired,
  selectedMapStyle: PropTypes.string.isRequired,
  onMapStyleSelectChange: PropTypes.func.isRequired,
};

export default withStyles(styles)(MapLayersPanel);
