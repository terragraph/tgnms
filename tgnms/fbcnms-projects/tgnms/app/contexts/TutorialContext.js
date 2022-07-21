/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import {MODULES} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';

export type MODULE = $Keys<typeof MODULES>;

export type TutorialContextType = {|
  showError: boolean,
  setShowError: boolean => void,
  stepIndex: number,
  nextStep: () => void,
  prevStep: () => void,
  resetStep: () => void,
  selectedTutorial: ?MODULE,
  setSelectedTutorial: (?MODULE) => void,
|};

const empty = () => {};

export const defaultValue = {
  showError: false,
  setShowError: empty,
  stepIndex: 0,
  nextStep: empty,
  prevStep: empty,
  resetStep: empty,
  selectedTutorial: MODULES.INTRO,
  setSelectedTutorial: empty,
};

// store topology data
const TutorialContext = React.createContext<TutorialContextType>(defaultValue);
export default TutorialContext;

export function useTutorialContext() {
  const ctx = React.useContext(TutorialContext);
  return ctx;
}

export function TutorialContextProvider({children}: {children: React.Node}) {
  const {Provider} = TutorialContext;
  const [showError, setShowError] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [selectedTutorial, setSelectedTutorial] = React.useState(null);

  const nextStep = React.useCallback(() => setStepIndex(cur => cur + 1), []);

  const prevStep = React.useCallback(() => setStepIndex(cur => cur - 1), []);

  const resetStep = React.useCallback(() => setStepIndex(0), []);

  React.useEffect(() => {
    resetStep();
  }, [resetStep, selectedTutorial]);

  return (
    <Provider
      value={{
        showError,
        setShowError,
        stepIndex,
        nextStep,
        prevStep,
        resetStep,
        selectedTutorial,
        setSelectedTutorial,
      }}>
      {children}
    </Provider>
  );
}
