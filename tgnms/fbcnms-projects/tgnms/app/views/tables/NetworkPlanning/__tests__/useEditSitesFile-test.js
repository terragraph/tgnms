/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {
  TestApp,
  mockInputFile,
  mockNetworkPlan,
  mockSitesFile,
  mockSitesFileRow,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, renderHook} from '@testing-library/react-hooks';
import {useEditSitesFile} from '../SitesFileTable';
jest.mock('axios');

let networkContextRef = {current: null};
beforeEach(() => {
  networkContextRef = {current: null};
});

describe('useEditSitesFile', () => {
  describe('updateSiteById', () => {
    test('modifies a site', () => {
      const {result} = testHook();
      act(() => {
        networkContextRef.current?.setSitesFile(mockSitesFile());
      });
      expect(result.current.sites[0]).toMatchObject({
        id: 0,
        name: 'POP-1',
        type: 'POP',
        location: expect.any(Object),
      });
      act(() => {
        result.current.updateSiteById(0, {
          ...result.current.sites[0],
          name: 'pop-updated',
        });
      });
      expect(result.current.sites[0]).toMatchObject({
        id: 0,
        name: 'pop-updated',
        type: 'POP',
        location: expect.any(Object),
      });
    });
  });
  describe('addSite', () => {
    test('adds a site', () => {
      const {result} = testHook();
      expect(result.current.sites).toEqual([]);
      act(() => {
        networkContextRef.current?.setSitesFile(mockSitesFile());
      });
      expect(result.current.sites.length).toBe(3);
      act(() => {
        result.current.addSite(mockSitesFileRow({name: 'new site'}));
      });
      expect(result.current.sites.length).toBe(4);
      expect(result.current.sites).toEqual(
        expect.arrayContaining([
          {
            id: expect.any(Number),
            name: 'new site',
            type: 'DN',
            location: expect.any(Object),
          },
        ]),
      );
    });
  });
});

function testHook() {
  function Wrapper({children}) {
    return (
      <TestApp>
        <NetworkPlanningContextProvider
          plan={mockNetworkPlan({sitesFile: mockInputFile()})}
          __ref={networkContextRef}>
          {children}
        </NetworkPlanningContextProvider>
      </TestApp>
    );
  }
  return renderHook(useEditSitesFile, {wrapper: Wrapper});
}
