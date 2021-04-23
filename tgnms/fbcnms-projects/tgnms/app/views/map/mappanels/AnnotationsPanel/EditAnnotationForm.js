/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import Box from '@material-ui/core/Box';
import Checkbox from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {ANNOTATION_COLORS} from '@fbcnms/tg-nms/app/constants/MapAnnotationConstants';
import {MAPBOX_DRAW_DEFAULT_COLOR} from '@fbcnms/tg-nms/app/constants/MapAnnotationConstants';
import {debounce} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {
  useAnnotationFeatures,
  useMapAnnotationContext,
} from '@fbcnms/tg-nms/app/contexts/MapAnnotationContext';
import type {AnnotationProperties} from '@fbcnms/tg-nms/shared/dto/MapAnnotations';
import type {GeoFeature} from '@turf/turf';

const defaultProperties: $Shape<AnnotationProperties> = {
  name: '',
  showName: false,
  color: '',
  opacity: 1.0,
};

const colorSize = 0.5;
const useStyles = makeStyles(theme => ({
  colorRadio: {
    padding: theme.spacing(colorSize),
  },
}));

export default function EditAnnotationForm({feature}: {feature: GeoFeature}) {
  const classes = useStyles();
  const {drawControl, updateFeatureProperties} = useMapAnnotationContext();
  const {updateFeature} = useAnnotationFeatures();
  const updateFeatureDebounced = React.useMemo(
    () => debounce((feature: GeoFeature) => updateFeature(feature), 500),
    [updateFeature],
  );
  const {formState, handleInputChange, setFormState, updateFormState} = useForm<
    $Shape<AnnotationProperties>,
  >({
    initialState: defaultProperties,
    onFormUpdated: update => {
      if (!feature || typeof feature.id === 'undefined') {
        return;
      }
      if (typeof feature.id !== 'undefined') {
        updateFeatureProperties(feature.id, update);
        updateFeatureDebounced(drawControl.get(feature.id));
      }
    },
  });
  // if feature changes, update the local form
  React.useEffect(() => {
    if (feature) {
      setFormState({
        ...defaultProperties,
        ...(feature?.properties: $Shape<AnnotationProperties>),
      });
    }
  }, [feature, setFormState]);

  if (!feature) {
    return null;
  }

  const radioProps = {
    name: 'color',
    classes: {root: classes.colorRadio},
    size: 'small',
  };
  return (
    <Grid container item xs={12} direction="column" spacing={1} wrap="nowrap">
      <Grid item xs={12}>
        <TextField
          onChange={handleInputChange(val => ({name: val}))}
          value={formState.name}
          label="Name"
          id="annotation-name"
          fullWidth
        />
        <FormControlLabel
          label={
            <Typography color="textSecondary">Show name on map</Typography>
          }
          color="secondary"
          control={
            <Checkbox
              checked={formState.showName}
              onChange={e => updateFormState({showName: e.target.checked})}
              fontSize="small"
            />
          }
          size="sm"
        />
      </Grid>
      <Grid item>
        <FormControl component="fieldset">
          <FormLabel component="legend">Color</FormLabel>
          <RadioGroup row>
            <Box my={1} mx={-colorSize}>
              <Radio
                key="default"
                {...radioProps}
                style={{color: MAPBOX_DRAW_DEFAULT_COLOR}}
                checked={!formState.color}
                value={''}
                inputProps={{'aria-label': 'default'}}
                onChange={e => updateFormState({color: e.target.value})}
              />
              {ANNOTATION_COLORS.map(color => (
                <Radio
                  key={color}
                  {...radioProps}
                  style={{color}}
                  checked={formState.color === color}
                  value={color}
                  onChange={e => updateFormState({color: e.target.value})}
                  inputProps={{'aria-label': color}}
                />
              ))}
            </Box>
          </RadioGroup>
        </FormControl>
      </Grid>
    </Grid>
  );
}
