/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Joyride, {ACTIONS, EVENTS, STATUS} from 'react-joyride';
import React from 'react';
import TutorialTooltip from '@fbcnms/tg-nms/app/components/tutorials/TutorialTooltip';
import {MODULES} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {TUTORIAL_STEPS} from '@fbcnms/tg-nms/app/components/tutorials/TutorialSteps';
import {useTutorialContext} from '@fbcnms/tg-nms/app/contexts/TutorialContext';

export default function Tutorials() {
  const [run, setRun] = React.useState(false);
  const [tutorialSteps, setTutorialSteps] = React.useState([]);

  const {
    showError,
    setShowError,
    stepIndex,
    prevStep,
    resetStep,
    selectedTutorial,
    setSelectedTutorial,
  } = useTutorialContext();

  React.useEffect(() => {
    if (selectedTutorial) {
      setRun(true);
      setTutorialSteps(TUTORIAL_STEPS[selectedTutorial]);
    }
  }, [selectedTutorial]);

  const handleTutorialCallback = React.useCallback(
    data => {
      const {action, type, status} = data;
      if (type === EVENTS.TARGET_NOT_FOUND) {
        // error check based on if target exists or not
        prevStep();
        setShowError(true);
      } else if (action == ACTIONS.NEXT && showError) {
        setShowError(false);
      }

      if (action === ACTIONS.CLOSE) {
        // if user closed tutorials reset
        resetStep();
        setSelectedTutorial(null);
        setRun(false);
      }

      if (status === STATUS.FINISHED && selectedTutorial) {
        // move onto next when tutorial module finishes
        const modules = Object.keys(MODULES);
        const nextModuleIndex = modules.indexOf(selectedTutorial) + 1;
        if (nextModuleIndex < modules.length) {
          resetStep();
          setRun(false);
          setSelectedTutorial(modules[nextModuleIndex]);
        }
      }
    },
    [
      selectedTutorial,
      prevStep,
      resetStep,
      setSelectedTutorial,
      setShowError,
      showError,
    ],
  );

  return (
    <Joyride
      steps={tutorialSteps}
      run={run}
      stepIndex={stepIndex}
      callback={handleTutorialCallback}
      tooltipComponent={TutorialTooltip}
      continuous={true}
      showProgress={true}
      disableCloseOnEsc={true}
      spotlightClicks={true}
      disableOverlayClose={true}
      scrollDuration={1000}
      spotlightPadding={0}
      disableOverlay={true}
      styles={{options: {zIndex: 1500}}}
    />
  );
}
