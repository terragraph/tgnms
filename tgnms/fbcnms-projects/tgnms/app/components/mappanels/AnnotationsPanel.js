/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import Box from '@material-ui/core/Box';
import Checkbox from '@material-ui/core/Checkbox';
import CustomAccordion from '../common/CustomAccordion';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import React from 'react';
import Slide from '@material-ui/core/Slide';
import TextField from '@material-ui/core/TextField';
import useForm from '../../hooks/useForm';
import {ANNOTATION_COLORS} from '../../constants/MapAnnotationConstants';
import {PANELS, PANEL_STATE} from './usePanelControl';
import {SlideProps} from '../../constants/MapPanelConstants';
import {debounce} from 'lodash';
import {useMapAnnotationContext} from '../../contexts/MapAnnotationContext';
import type {PanelStateControl} from './usePanelControl';

export default function AnnotationsPanel({
  panelControl,
}: {
  panelControl: PanelStateControl,
}) {
  const {
    getIsHidden,
    getIsOpen,
    toggleOpen,
    setPanelState,
    collapseAll,
  } = panelControl;
  const {selectedFeatureId, deselectAll} = useMapAnnotationContext();
  const togglePanel = React.useCallback(() => toggleOpen(PANELS.ANNOTATIONS), [
    toggleOpen,
  ]);
  const handleClose = React.useCallback(() => {
    setPanelState(PANELS.ANNOTATIONS, PANEL_STATE.HIDDEN);
    deselectAll();
  }, [setPanelState, deselectAll]);
  React.useEffect(() => {
    if (selectedFeatureId) {
      collapseAll();
      setPanelState(PANELS.ANNOTATIONS, PANEL_STATE.OPEN);
    }
  }, [selectedFeatureId, setPanelState, collapseAll]);

  /**
   * For now, the annotations panel is only used to render the
   * EditAnnotationForm, so the panel is closed when not in use.
   */
  React.useEffect(() => {
    if (!selectedFeatureId) {
      setPanelState(PANELS.ANNOTATIONS, PANEL_STATE.HIDDEN);
    }
  }, [selectedFeatureId, setPanelState]);

  return (
    <Slide {...SlideProps} in={!getIsHidden(PANELS.ANNOTATIONS)}>
      <CustomAccordion
        title="Annotations"
        data-testid="annotations-panel"
        details={<>{selectedFeatureId && <EditAnnotationForm />}</>}
        expanded={getIsOpen(PANELS.ANNOTATIONS)}
        onChange={togglePanel}
        onClose={handleClose}
      />
    </Slide>
  );
}

const defaultProperties: $Shape<AnnotationProperties> = {
  name: '',
  showName: false,
  color: null,
  opacity: null,
};
function EditAnnotationForm() {
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

/**
 * Most customizable things on an annotation come from its GeoJSON Properties
 */
type AnnotationProperties = {|
  name: string,
  showName: boolean,
  color: ?string,
  opacity: ?number,
|};
