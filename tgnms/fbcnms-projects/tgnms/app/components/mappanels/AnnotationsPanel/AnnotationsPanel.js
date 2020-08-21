/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import CustomAccordion from '../../common/CustomAccordion';
import EditAnnotationForm from './EditAnnotationForm';
import Grid from '@material-ui/core/Grid';
import Measurement from './Measurement';
import React from 'react';
import Slide from '@material-ui/core/Slide';
import {PANELS, PANEL_STATE} from '../usePanelControl';
import {SlideProps} from '../../../constants/MapPanelConstants';
import {useMapAnnotationContext} from '../../../contexts/MapAnnotationContext';
import type {PanelStateControl} from '../usePanelControl';

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
        details={
          <Grid container direction="column" spacing={2}>
            {selectedFeatureId && (
              <>
                <EditAnnotationForm />
                <Measurement />
              </>
            )}
          </Grid>
        }
        expanded={getIsOpen(PANELS.ANNOTATIONS)}
        onChange={togglePanel}
        onClose={handleClose}
      />
    </Slide>
  );
}
