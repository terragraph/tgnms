/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as TutorialConstants from '../TutorialConstants';
import * as TutorialStepHelpers from '../TutorialStepHelpers';

test('test addSiteFlow', () => {
  const result = TutorialStepHelpers.addSiteFlow(
    TutorialConstants.SITE_NUMBERS.FIRST,
  );
  expect(result[0].title).toEqual('Open the topology toolbar');
  expect(result[1].title).toEqual('Add the first site');
});

test('addLinkFlow for first site step should be an empty array', () => {
  const result = TutorialStepHelpers.addLinkFlow(
    TutorialConstants.SITE_NUMBERS.FIRST,
  );
  expect(result.length).toEqual(0);
});

test('addLinkFlow for other steps should have steps', () => {
  const result = TutorialStepHelpers.addLinkFlow(
    TutorialConstants.SITE_NUMBERS.SECOND,
  );
  expect(result[0].title).toEqual('Open the Links section');
});
