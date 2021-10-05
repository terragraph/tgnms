/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import {filterANPTopology, suggestVersionedName} from '../PlanningHelpers';
import {mockUploadANPJson} from '@fbcnms/tg-nms/app/tests/data/UploadTopology';

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

describe('filterANPTopology', () => {
  test('filters out elements based on status types', () => {
    const topology = JSON.parse(
      mockUploadANPJson(__dirname, 'planning_mock_ANP.json'),
    );
    let res = filterANPTopology(topology, {
      enabledStatusTypes: {
        PROPOSED: true,
        UNAVAILABLE: false,
        CANDIDATE: false,
      },
    });
    expect(Object.keys(res.sectors).length).toEqual(5);
    expect(Object.keys(res.links).length).toEqual(3);
    expect(Object.keys(res.sites).length).toEqual(2);

    res = filterANPTopology(topology, {
      enabledStatusTypes: {
        PROPOSED: false,
        UNAVAILABLE: true,
        CANDIDATE: false,
      },
    });
    expect(Object.keys(res.sectors).length).toEqual(0);
    expect(Object.keys(res.links).length).toEqual(0);
    expect(Object.keys(res.sites).length).toEqual(1);
  });
});
