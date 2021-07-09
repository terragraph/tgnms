/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import {MODULES} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {TutorialContextProvider, useTutorialContext} from '../TutorialContext';
import {act, renderHook} from '@testing-library/react-hooks';

test('renders', () => {
  const {result} = renderHook(useTutorialContext, {
    wrapper: TutorialContextProvider,
  });
  expect(result.current.selectedTutorial).toBe(null);
});

test('step increments properly', () => {
  const {result} = renderHook(useTutorialContext, {
    wrapper: TutorialContextProvider,
  });
  expect(result.current.stepIndex).toBe(0);
  act(() => {
    result.current.setSelectedTutorial(MODULES.INTRO);
  });
  act(() => {
    result.current.nextStep();
  });
  expect(result.current.stepIndex).toBe(1);
});

test('steps are reset when selected tutorial changes', async () => {
  const {result} = renderHook(useTutorialContext, {
    wrapper: TutorialContextProvider,
  });
  expect(result.current.stepIndex).toBe(0);
  expect(result.current.selectedTutorial).toBe(null);

  act(() => {
    result.current.nextStep();
  });
  expect(result.current.stepIndex).toBe(1);
  act(() => {
    result.current.setSelectedTutorial(MODULES.INTRO);
  });
  expect(result.current.stepIndex).toBe(0);
});
