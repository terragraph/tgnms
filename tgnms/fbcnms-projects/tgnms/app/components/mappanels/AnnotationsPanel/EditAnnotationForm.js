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
import useForm from '../../../hooks/useForm';
import {ANNOTATION_COLORS} from '../../../constants/MapAnnotationConstants';
import {MAPBOX_DRAW_DEFAULT_COLOR} from '../../../constants/MapAnnotationConstants';
import {debounce} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {
  useAnnotationFeatures,
  useMapAnnotationContext,
} from '../../../contexts/MapAnnotationContext';
import type {GeoFeature} from '@turf/turf';

/**
 * Most customizable things on an annotation come from its GeoJSON Properties.
 * Be careful modifying these types, they're queried by mapbox-gl-js
 * style expressions.
 */
export type AnnotationProperties = {|
  name: string,
  showName: boolean,
  color: string,
  opacity: ?number,
|};

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

export default function EditAnnotationForm() {
  const classes = useStyles();
  const {selectedFeature, drawControl} = useMapAnnotationContext();
  const {updateFeatureProperty, updateFeature} = useAnnotationFeatures();
  const updateFeatureDebounced = React.useMemo(
    () => debounce((feature: GeoFeature) => updateFeature(feature), 500),
    [updateFeature],
  );
  const {formState, handleInputChange, setFormState, updateFormState} = useForm<
    $Shape<AnnotationProperties>,
  >({
    initialState: defaultProperties,
    onFormUpdated: update => {
      if (!selectedFeature || typeof selectedFeature.id === 'undefined') {
        return;
      }
      if (typeof selectedFeature.id !== 'undefined') {
        for (const key of Object.keys(update)) {
          const val = update[key];
          updateFeatureProperty(selectedFeature.id, key, val);
        }
        updateFeatureDebounced(drawControl.get(selectedFeature.id));
      }
    },
  });
  // if selectedFeature changes, update the local form
  React.useEffect(() => {
    if (selectedFeature) {
      setFormState({
        ...defaultProperties,
        ...(selectedFeature?.properties: $Shape<AnnotationProperties>),
      });
    }
  }, [selectedFeature, setFormState]);

  if (!selectedFeature) {
    return null;
  }

  const radioProps = {
    name: 'color',
    classes: {root: classes.colorRadio},
    size: 'small',
  };
  return (
    <Grid container item xs={12} direction="column" spacing={1}>
      <Grid item>
        <TextField
          onChange={handleInputChange(val => ({name: val}))}
          value={formState.name}
          label="Name"
          id="annotation-name"
          fullWidth
        />
        <FormControlLabel
          label="Show name on map"
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
