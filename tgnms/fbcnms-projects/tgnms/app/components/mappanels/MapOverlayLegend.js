/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Chip from '@material-ui/core/Chip';
import MapLayersPanelConfigButton from './MapLayersPanelConfigButton';
import React from 'react';
import {METRIC_COLOR_RANGE} from '../../constants/LayerConstants';
import {convertType} from '../../helpers/ObjectHelpers';
import {has} from 'lodash';
import {withStyles} from '@material-ui/core/styles';

import type {ChangeOverlayRange, Overlay} from '../../views/map/overlays';
import type {OverlayConfig} from '../../views/map/NetworkMapTypes';

const styles = theme => ({
  formContainer: {
    flexDirection: 'column',
  },
  chip: {
    height: 20,
  },
  chipLabel: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
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
});

type Props = {
  classes: {[string]: string},
  layerOverlays: OverlayConfig<any>,
  overlay: ?Overlay,
};
class MapOverlayLegend extends React.Component<Props> {
  getLegend(input: {
    legendConfig: {[string]: {color: string}},
    overlay: Overlay,
    changeOverlayRange: ChangeOverlayRange,
  }) {
    const {classes} = this.props;
    const {legendConfig, overlay, changeOverlayRange} = input;
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
            idx < range.length &&
            overlay.overlayLegendType !== 'ignition_status'
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
        {range &&
          range.length === METRIC_COLOR_RANGE.length &&
          overlay.overlayLegendType !== 'ignition_status' && (
            <MapLayersPanelConfigButton
              changeOverlayRange={changeOverlayRange}
              legendConfig={legendConfig}
              overlay={convertType<{range: Array<number>, ...Overlay}>(overlay)}
            />
          )}
      </div>
    );
  }

  render() {
    const {layerOverlays, overlay} = this.props;
    return (
      <div>
        {overlay &&
          has(layerOverlays, ['legend', overlay.type]) &&
          this.getLegend({
            legendConfig:
              layerOverlays.legend[
                overlay.overlayLegendType
                  ? overlay.overlayLegendType
                  : overlay.type
              ],
            overlay: overlay,
            changeOverlayRange: layerOverlays.changeOverlayRange,
          })}
      </div>
    );
  }
}

export default withStyles(styles)(MapOverlayLegend);
