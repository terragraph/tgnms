/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CircularProgress from '@material-ui/core/CircularProgress';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import MapOverlayLegend from './MapOverlayLegend';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import Select from '@material-ui/core/Select';
import Slider from 'rc-slider';
import Typography from '@material-ui/core/Typography';
import {KeyboardDatePicker} from '@material-ui/pickers';
import {
  MILLISECONDS_TO_MINUTES,
  MINUTES_IN_DAY,
} from '../../constants/LayerConstants';
import {withStyles} from '@material-ui/core/styles';

import type {
  OverlaysConfig,
  SelectedOverlays,
} from '../../views/map/NetworkMapTypes';

const DATE_TO_STRING_PARAMS = [
  'en-US',
  {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  },
];

const styles = theme => ({
  formContainer: {
    flexDirection: 'column',
  },
  sectionPadding: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
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
  centered: {
    textAlign: 'center',
  },
});

export type Props = {
  overlaysConfig: OverlaysConfig,
  selectedOverlays: SelectedOverlays,
  onHistoricalTimeChange: number => void,
  onHistoricalDateChange: Date => void,
  onOverlaySelectChange: SelectedOverlays => void,
  errorMessage?: ?string,
  overlayLoading: boolean,
  date: Date,
  selectedTime: Date,
};

class MapHistoryOverlay extends React.Component<
  Props & {classes: {[string]: string}},
> {
  handleDateChange(date) {
    const {onHistoricalDateChange} = this.props;
    if (date.toString() === 'Invalid Date') {
      return;
    }
    onHistoricalDateChange(new Date(date));
  }

  handleOverlaySelectionChange = () => event => {
    const {onOverlaySelectChange, selectedOverlays} = this.props;
    onOverlaySelectChange({
      link_lines: event.target.value,
      site_icons: selectedOverlays.site_icons,
    });
  };

  onSliderChange = selectedTime => {
    this.props.onHistoricalTimeChange(selectedTime);
  };

  render() {
    const {
      classes,
      overlaysConfig,
      date,
      selectedTime,
      overlayLoading,
      errorMessage,
      selectedOverlays,
    } = this.props;

    const currentOverlay = selectedOverlays.link_lines;
    const linkOverlayConfig = overlaysConfig.link_lines;
    const overlay = linkOverlayConfig.overlays.find(
      overlay => overlay.id === selectedOverlays.link_lines,
    );

    return (
      <div className={classes.formContainer}>
        <div>
          <Typography variant="subtitle2">Selected Date</Typography>
          <KeyboardDatePicker
            disableToolbar
            inputVariant="outlined"
            format="MM/DD/YYYY"
            margin="dense"
            id="date"
            value={date.toISOString().split('T')[0]}
            onChange={ev => this.handleDateChange(ev._d)}
            KeyboardButtonProps={{
              'aria-label': 'change date',
            }}
          />
        </div>
        <div className={classes.sectionPadding} />
        {overlayLoading ? (
          <div data-testid="loadingCircle" className={classes.centered}>
            <CircularProgress />
          </div>
        ) : errorMessage ? (
          <Typography data-testid="errorMessage" variant="subtitle1">
            Error getting data: {errorMessage}
          </Typography>
        ) : (
          <>
            <FormLabel component="legend">
              <span>Current Value:</span>
            </FormLabel>
            <div>
              {selectedTime.toLocaleDateString(...DATE_TO_STRING_PARAMS)}
            </div>
            <Slider
              value={Math.round(
                (selectedTime.getTime() - date.getTime()) /
                  MILLISECONDS_TO_MINUTES,
              )}
              min={0}
              max={MINUTES_IN_DAY}
              step={1}
              onChange={this.onSliderChange}
            />
            <div className={classes.sectionPadding} />
            <FormGroup row={false} className={classes.formGroup}>
              <FormLabel component="legend">
                <span>Link Lines Overlay</span>
              </FormLabel>
              <Select
                value={currentOverlay}
                className={classes.select}
                onChange={this.handleOverlaySelectionChange()}>
                {linkOverlayConfig.overlays.map(overlay => {
                  return (
                    <MenuItem key={overlay.id} value={overlay.id}>
                      {overlay.name}
                    </MenuItem>
                  );
                })}
              </Select>
              <MapOverlayLegend
                overlay={overlay}
                layerOverlays={linkOverlayConfig}
              />
            </FormGroup>
          </>
        )}
      </div>
    );
  }
}

export default withStyles(styles)(MapHistoryOverlay);
