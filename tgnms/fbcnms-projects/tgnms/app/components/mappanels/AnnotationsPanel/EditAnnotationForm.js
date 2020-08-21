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
import {debounce} from 'lodash';
import {useMapAnnotationContext} from '../../../contexts/MapAnnotationContext';

/**
 * Most customizable things on an annotation come from its GeoJSON Properties
 */
export type AnnotationProperties = {|
  name: string,
  showName: boolean,
  color: ?string,
  opacity: ?number,
|};

const defaultProperties: $Shape<AnnotationProperties> = {
  name: '',
  showName: false,
  color: null,
  opacity: null,
};
export default function EditAnnotationForm() {
  const {
    selectedFeature,
    updateFeatureProperty,
    updateFeatures,
    drawControl,
  } = useMapAnnotationContext();
  const updateFeaturesDebounced = React.useMemo(
    () => debounce(() => updateFeatures(drawControl.getAll()), 2000),
    [updateFeatures, drawControl],
  );
  const {formState, handleInputChange, setFormState, updateFormState} = useForm<
    $Shape<AnnotationProperties>,
  >({
    initialState: defaultProperties,
    onFormUpdated: update => {
      if (!selectedFeature || typeof selectedFeature.id === 'undefined') {
        return;
      }
      for (const key of Object.keys(update)) {
        const val = update[key];
        if (typeof selectedFeature.id !== 'undefined') {
          updateFeatureProperty(selectedFeature.id, key, val);
        }
      }
      updateFeaturesDebounced();
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

  return (
    <Grid container item xs={12} direction="column" spacing={1}>
      <Grid item>
        <TextField
          onChange={handleInputChange(val => ({name: val}))}
          value={formState.name}
          label="Title"
          id="annotation-title"
          fullWidth
        />
        <FormControlLabel
          label="Show title on map"
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
            <Box mx={-1}>
              {ANNOTATION_COLORS.map(color => (
                <Radio
                  key={color}
                  checked={formState.color === color}
                  onChange={e => updateFormState({color: e.target.value})}
                  name="color"
                  value={color}
                  inputProps={{'aria-label': color}}
                  style={{color}}
                />
              ))}
            </Box>
          </RadioGroup>
        </FormControl>
      </Grid>
    </Grid>
  );
}
