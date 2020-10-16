/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'rc-slider/assets/index.css';
import Button from '@material-ui/core/Button';
import EditIcon from '@material-ui/icons/Edit';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import MaterialModal from '../common/MaterialModal';
import React from 'react';
import Slider from 'rc-slider';
import {METRIC_COLOR_RANGE} from '../../constants/LayerConstants';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '../../contexts/MapContext';

const RangeSlider = Slider.createSliderWithTooltip(Slider.Range);

const rangeReversed = range => {
  return range[0] < range[1];
};

const useStyles = makeStyles(theme => ({
  editIconButton: {
    position: 'absolute',
    right: theme.spacing(3),
  },
  editIcon: {width: theme.spacing(2.5)},
}));

export default function EditLegendButton() {
  const classes = useStyles();

  const {
    overlaysConfig,
    selectedOverlays,
    setOverlaysConfig,
    setLayerOverlay,
  } = useMapContext();

  const overlay = React.useMemo(
    () =>
      overlaysConfig.link_lines?.overlays.find(
        overlay =>
          overlay.id === selectedOverlays[overlaysConfig.link_lines.layerId],
      ) ?? {},
    [overlaysConfig, selectedOverlays],
  );

  const legendConfig = React.useMemo(
    () => ({
      ...(overlaysConfig.link_lines?.legend[
        overlay.overlayLegendType ?? overlay.type
      ] ?? {}),
    }),
    [overlay, overlaysConfig],
  );

  const [isEditing, setIsEditing] = React.useState(false);
  const [range, setRange] = React.useState([...(overlay?.range ?? [])]);
  const rangeLength = React.useMemo(() => range.length, [range]);
  const {units} = overlay;

  React.useEffect(() => setRange([...(overlay?.range ?? [])]), [overlay]);

  const handleCloseEditButton = React.useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSubmit = React.useCallback(() => {
    const overlayIndex = overlaysConfig.link_lines.overlays.findIndex(
      linkOverlay => linkOverlay.id === overlay.id,
    );
    overlaysConfig.link_lines.overlays[overlayIndex].range = range;

    setOverlaysConfig(overlaysConfig);
    setLayerOverlay('link_lines', overlay.id);
    setIsEditing(false);
  }, [overlay, setLayerOverlay, range, overlaysConfig, setOverlaysConfig]);

  const handleRangeOnChange = React.useCallback(
    currentRange => {
      setRange(
        rangeReversed(range) ? [...currentRange] : [...currentRange].reverse(),
      );
    },
    [range],
  );

  const createLabelName = React.useCallback(
    (labelName, idx) => {
      if (range.length === METRIC_COLOR_RANGE.length) {
        if (idx < range.length) {
          if (rangeReversed(range)) {
            return labelName + ` <= ${range[idx]}${units ?? ''}`;
          } else {
            return labelName + ` >= ${range[idx]}${units ?? ''}`;
          }
        } else {
          return labelName + ` : no value`;
        }
      }
      return labelName;
    },
    [units, range],
  );

  const handleColors = Object.keys(legendConfig).map((e, idx) => {
    if (idx < rangeLength) {
      if (rangeReversed(range)) {
        const color = legendConfig[e].color;
        return {
          borderColor: color,
          backgroundColor: color,
        };
      } else {
        const color =
          legendConfig[Object.keys(legendConfig)[rangeLength - 1 - idx]].color;
        return {
          borderColor: color,
          backgroundColor: color,
        };
      }
    }
  });

  const tempRange = React.useMemo(
    () => (rangeReversed(range) ? [...range] : [...range].reverse()),
    [range],
  );

  return (
    <>
      <IconButton
        size="small"
        className={classes.editIconButton}
        onClick={() => setIsEditing(true)}
        data-testid="edit-legend-button">
        <EditIcon className={classes.editIcon} color="secondary" />
      </IconButton>
      <MaterialModal
        modalTitle={`Edit Link ${overlay.name} Display Color Ranges`}
        modalContent={
          <>
            <RangeSlider
              min={
                overlay.bounds
                  ? Math.min(overlay.bounds[0], overlay.bounds[1]) ?? 0
                  : 0
              }
              max={
                overlay.bounds
                  ? Math.max(overlay.bounds[0], overlay.bounds[1])
                  : 0
              }
              allowCross={false}
              step={0.1}
              value={tempRange}
              onChange={handleRangeOnChange}
              trackStyle={Array(range.length - 1).fill({
                backgroundColor: 'LightSkyBlue',
              })}
              handleStyle={handleColors}
              railStyle={{backgroundColor: 'LightSkyBlue'}}
            />
            <List>
              {Object.keys(legendConfig).map((element, idx) => {
                const elementColor = legendConfig[element].color;
                const labelName = createLabelName(
                  element.replace('_', ' '),
                  idx,
                );
                return (
                  <ListItem key={element}>
                    <span
                      style={{
                        color: elementColor,
                      }}>
                      {labelName}
                    </span>
                  </ListItem>
                );
              })}
            </List>
          </>
        }
        data-testid={isEditing ? 'modal-open' : 'modal-closed'}
        open={isEditing}
        onClose={handleCloseEditButton}
        modalActions={
          <Grid container spacing={2} style={{justifyContent: 'flex-end'}}>
            <Grid item>
              <Button
                data-testid="cancel-button"
                variant="text"
                onClick={handleCloseEditButton}>
                Cancel
              </Button>
            </Grid>
            <Grid item>
              <Button
                data-testid="submit-button"
                variant="contained"
                onClick={handleSubmit}
                color="primary">
                Done
              </Button>
            </Grid>
          </Grid>
        }
      />
    </>
  );
}
