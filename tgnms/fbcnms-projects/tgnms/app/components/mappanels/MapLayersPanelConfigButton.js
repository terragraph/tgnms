/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';

import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import {withStyles} from '@material-ui/core/styles';

import MaterialModal from '../common/MaterialModal';
import {METRIC_COLOR_RANGE} from '../../constants/LayerConstants';

import 'rc-slider/assets/index.css';
import Slider from 'rc-slider';

import type {
  ChangeOverlayRange,
  Overlay,
} from '../../views/map/NetworkMapTypes';

const Range = Slider.createSliderWithTooltip(Slider.Range);

const rangeReversed = range => {
  return range[0] > range[1];
};

const styles = theme => ({
  button: {
    margin: theme.spacing(),
  },
  chip: {
    height: 20,
  },
  chipLabel: {
    paddingHorizontal: theme.spacing(),
  },
});

const sortNumber = (a, b) => {
  return a - b;
};

type Props = {
  classes: {[string]: string},
  changeOverlayRange: ChangeOverlayRange,
  legendConfig: Object,
  overlay: {range: Array<number>, ...Overlay},
};

type State = {
  isEditing: boolean,
  tempRange: Array<number>,
  lastRange: Array<number>,
};

class MapLayersPanelConfigButton extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const {range} = this.props.overlay;
    this.state = {
      isEditing: false,
      tempRange: range.slice().sort(sortNumber),
      lastRange: range,
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.overlay.range !== state.lastRange) {
      return {
        tempRange: props.overlay.range.slice().sort(sortNumber),
        lastRange: props.overlay.range,
      };
    }
    return null;
  }

  handleToggleOverlayConfiguration = () => {
    this.setState(prevState => {
      return {
        isEditing: !prevState.isEditing,
      };
    });
  };

  handleCloseOverlayConfiguration = () => {
    const {range} = this.props.overlay;
    this.handleToggleOverlayConfiguration();
    this.setState({
      tempRange: range,
    });
  };

  handleSaveOverlayConfiguration = () => {
    const {changeOverlayRange, overlay} = this.props;
    const {tempRange} = this.state;
    changeOverlayRange(
      overlay.id,
      rangeReversed(overlay.range) ? tempRange.slice().reverse() : tempRange,
    );
    this.handleToggleOverlayConfiguration();
  };

  handleRangeOnChange = currentRange => {
    this.setState({
      tempRange: currentRange,
    });
  };

  createLabelName(labelName, idx) {
    const {tempRange} = this.state;
    const {range, units = ''} = this.props.overlay;
    if (range.length === METRIC_COLOR_RANGE.length) {
      if (idx < range.length) {
        if (rangeReversed(range)) {
          return (
            labelName + ` >= ${tempRange[tempRange.length - 1 - idx]}${units}`
          );
        } else {
          return labelName + ` <= ${tempRange[idx]}${units}`;
        }
      } else {
        return labelName + ` : no value`;
      }
    }
    return labelName;
  }

  render() {
    const {classes, legendConfig, overlay} = this.props;
    const {isEditing, tempRange} = this.state;
    const {range} = overlay;
    const rangeLength = range.length;

    const handleColors = Object.keys(legendConfig).map((e, idx) => {
      if (idx < rangeLength) {
        if (rangeReversed(range)) {
          const color =
            legendConfig[Object.keys(legendConfig)[rangeLength - 1 - idx]]
              .color;
          return {
            borderColor: color,
            backgroundColor: color,
          };
        }
        const color = legendConfig[e].color;
        return {
          borderColor: color,
          backgroundColor: color,
        };
      }
    });

    return (
      <span>
        <Chip
          className={classes.chip}
          classes={{label: classes.chipLabel}}
          label="Configure Thresholds"
          onClick={this.handleToggleOverlayConfiguration}
        />
        {isEditing && tempRange && overlay && overlay.bounds && range && (
          <MaterialModal
            modalTitle={`Edit Link ${overlay.name} Display Color Ranges`}
            modalContent={
              <div>
                <Range
                  min={Math.min(overlay.bounds[0], overlay.bounds[1])}
                  max={
                    overlay.bounds
                      ? Math.max(overlay.bounds[0], overlay.bounds[1])
                      : 0
                  }
                  allowCross={false}
                  step={0.1}
                  value={tempRange}
                  onChange={this.handleRangeOnChange}
                  trackStyle={Array(range.length - 1).fill({
                    backgroundColor: 'LightSkyBlue',
                  })}
                  handleStyle={handleColors}
                  railStyle={{backgroundColor: 'LightSkyBlue'}}
                />
                <List>
                  {Object.keys(legendConfig).map((element, idx) => {
                    const elementColor = legendConfig[element].color;
                    const labelName = this.createLabelName(
                      element.replace('_', ' '),
                      idx,
                    );
                    return (
                      <ListItem key={element}>
                        <span
                          className={classes.chipLabel}
                          style={{
                            color: elementColor,
                          }}>
                          {labelName}
                        </span>
                      </ListItem>
                    );
                  })}
                </List>
              </div>
            }
            open={isEditing}
            onClose={this.handleCloseOverlayConfiguration}
            modalActions={
              <div>
                <Button
                  className={classes.button}
                  variant="outlined"
                  onClick={this.handleCloseOverlayConfiguration}>
                  Cancel
                </Button>
                <Button
                  className={classes.button}
                  variant="outlined"
                  onClick={this.handleSaveOverlayConfiguration}>
                  Done
                </Button>
              </div>
            }
          />
        )}
      </span>
    );
  }
}

export default withStyles(styles)(MapLayersPanelConfigButton);
