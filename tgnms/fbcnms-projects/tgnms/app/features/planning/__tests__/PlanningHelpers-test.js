/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import {suggestVersionedName} from '../PlanningHelpers';

describe('suggest name', () => {
  test('adds version number if no version is set', () => {
    expect(suggestVersionedName('plan')).toBe('plan V2');
  });
  test('increments version if version is set', () => {
    expect(suggestVersionedName('plan v1')).toBe('plan v2');
    expect(suggestVersionedName('plan V1')).toBe('plan V2');
    expect(suggestVersionedName('plan v2')).toBe('plan v3');
    expect(suggestVersionedName('plan V2')).toBe('plan V3');
    expect(suggestVersionedName('plan V3')).toBe('plan V4');
  });
});
