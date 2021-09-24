/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import {NetworkContextWrapper} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {PLANNING_BASE_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {Route} from 'react-router-dom';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, renderHook} from '@testing-library/react-hooks';
import {mockNode, mockSite} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockUploadANPJson} from '@fbcnms/tg-nms/app/tests/data/UploadTopology';
import {useNetworkPlanningManager} from '../useNetworkPlanningManager';

const folder1Path = PLANNING_BASE_PATH + '/folder/1';

describe('useNetworkPlanningManager', () => {
  let _planTopology;

  const wrapper = ({
    children,
    networkContext = {},
    mapOptions,
    planTopology,
  }) => (
    <TestApp route={folder1Path}>
      <NetworkContextWrapper contextValue={networkContext}>
        <NetworkPlanningContextProvider
          planTopology={planTopology}
          setPlanTopology={() => {}}
          mapOptions={mapOptions}
          setMapOptions={() => {}}>
          <Route path={PLANNING_BASE_PATH} render={() => children} />
        </NetworkPlanningContextProvider>
      </NetworkContextWrapper>
    </TestApp>
  );

  beforeEach(() => {
    _planTopology = JSON.parse(mockUploadANPJson(__dirname, 'mockANP.json'));
  });

  describe('filtered topology', () => {
    test('should update filtered topology', async () => {
      const {result, rerender} = renderHook(() => useNetworkPlanningManager(), {
        wrapper,
        initialProps: {
          mapOptions: {
            enabledStatusTypes: {
              PROPOSED: false,
              UNAVAILABLE: false,
              CANDIDATE: true,
            },
          },
          planTopology: _planTopology,
        },
      });

      // Sanity check
      let sites = Object.keys(result.current.filteredTopology.sites);
      expect(sites.length).toEqual(1);
      expect(sites.includes('site3')).toBeTruthy();

      // Change the mapOptions
      rerender({
        mapOptions: {
          enabledStatusTypes: {
            PROPOSED: false,
            UNAVAILABLE: true,
            CANDIDATE: true,
          },
        },
        planTopology: _planTopology,
      });
      sites = Object.keys(result.current.filteredTopology.sites);
      expect(sites.length).toEqual(2);
      expect(sites.includes('site3')).toBeTruthy();
      expect(sites.includes('site4')).toBeTruthy();

      // Change the planTopology
      delete _planTopology.sites['site4'];
      rerender({
        mapOptions: {
          enabledStatusTypes: {
            PROPOSED: false,
            UNAVAILABLE: true,
            CANDIDATE: true,
          },
        },
        planTopology: _planTopology,
      });
      sites = Object.keys(result.current.filteredTopology.sites);
      expect(sites.length).toEqual(1);
      expect(sites.includes('site3')).toBeTruthy();
      expect(sites.includes('site4')).toBeFalsy();
    });
    test('should only select one of the duplicate links', async () => {
      const {result} = renderHook(() => useNetworkPlanningManager(), {
        wrapper,
        initialProps: {
          mapOptions: {
            enabledStatusTypes: {
              PROPOSED: true,
              UNAVAILABLE: false,
              CANDIDATE: true,
            },
          },
          planTopology: _planTopology,
        },
      });

      const links = Object.keys(result.current.filteredTopology.links);
      expect(links.length).toEqual(1);
      expect(links.includes('link20_30')).toBeTruthy();
    });
  });

  describe('setPendingTopology and getPendingTopology', () => {
    test('should work with link and site selections', () => {
      const {result} = renderHook(() => useNetworkPlanningManager(), {
        wrapper,
        initialProps: {
          mapOptions: {
            enabledStatusTypes: {
              PROPOSED: true,
              UNAVAILABLE: true,
              CANDIDATE: true,
            },
          },
          planTopology: _planTopology,
        },
      });

      // Select site1 and site3
      act(() => {
        result.current.setPendingTopology(
          [
            {id: 'site1', type: 'site'},
            {id: 'site3', type: 'site'},
          ],
          'sites',
        );
      });

      let res = result.current.getPendingTopology();
      let siteNames = res.sites.map(site => site.name);
      expect(siteNames.length).toEqual(2);
      expect(siteNames.includes('site1'));
      expect(siteNames.includes('site3'));

      let nodeNames = res.nodes.map(node => node.name);
      expect(nodeNames.length).toEqual(0);

      let linkNames = res.links.map(link => link.name);
      expect(linkNames.length).toBe(0);

      // Select link from node 20 to node 30
      act(() => {
        result.current.setPendingTopology(
          [{id: 'link20_30', type: 'link'}],
          'links',
        );
      });

      res = result.current.getPendingTopology();
      siteNames = res.sites.map(site => site.name);
      expect(siteNames.length).toEqual(3);
      expect(siteNames.includes('site1')); // site1 still here from the prev selection
      expect(siteNames.includes('site2'));
      expect(siteNames.includes('site3'));

      nodeNames = res.nodes.map(node => node.name);
      expect(nodeNames.length).toEqual(2);
      expect(nodeNames.includes('site2_0'));
      expect(nodeNames.includes('site3_0'));

      linkNames = res.links.map(link => link.name);
      expect(linkNames.length).toEqual(1);
      expect(linkNames.includes('link-site2_0-site3_0'));
    });

    test('should only contain elements that are NOT in the current topology', () => {
      const {result} = renderHook(() => useNetworkPlanningManager(), {
        wrapper,
        initialProps: {
          networkContext: {
            // site2 and its nodes already exist.
            siteMap: {site2: mockSite()},
            nodeMap: {site2_0: mockNode()},
          },
          mapOptions: {
            enabledStatusTypes: {
              PROPOSED: true,
              UNAVAILABLE: true,
              CANDIDATE: true,
            },
          },
          planTopology: _planTopology,
        },
      });
      // Select link from node 20 to node 30
      act(() => {
        result.current.setPendingTopology(
          [{id: 'link20_30', type: 'link'}],
          'links',
        );
      });

      const res = result.current.getPendingTopology();
      const siteNames = res.sites.map(site => site.name);
      expect(siteNames.length).toEqual(1);
      expect(siteNames.includes('site3'));

      const nodeNames = res.nodes.map(node => node.name);
      expect(nodeNames.length).toEqual(1);
      expect(nodeNames.includes('site3_0'));

      const linkNames = res.links.map(link => link.name);
      expect(linkNames.length).toEqual(1);
      expect(linkNames.includes('link-site2_0-site3_0'));
    });

    // We have two material table selections coalescing into one
    // pendingTopology state object; thus some weird things can happen
    test('when unselecting all of one type, leaves the other intact', () => {
      // This tests one scenario: ensure completely unselecting one leaves
      // the other intact.

      const {result} = renderHook(() => useNetworkPlanningManager(), {
        wrapper,
        initialProps: {
          mapOptions: {
            enabledStatusTypes: {
              PROPOSED: true,
              UNAVAILABLE: true,
              CANDIDATE: true,
            },
          },
          planTopology: _planTopology,
        },
      });

      act(() => {
        // Select site1 and site3
        result.current.setPendingTopology(
          [
            {id: 'site1', type: 'site'},
            {id: 'site3', type: 'site'},
          ],
          'sites',
        );
      });

      act(() => {
        // Select link from node 20 to node 30
        result.current.setPendingTopology(
          [{id: 'link20_30', type: 'link'}],
          'links',
        );
      });

      let res = result.current.getPendingTopology();
      let siteNames = res.sites.map(site => site.name);
      expect(siteNames.length).toEqual(3);
      expect(siteNames.includes('site1'));
      expect(siteNames.includes('site2'));
      expect(siteNames.includes('site3'));

      let nodeNames = res.nodes.map(node => node.name);
      expect(nodeNames.length).toEqual(2);
      expect(nodeNames.includes('site2_0'));
      expect(nodeNames.includes('site3_0'));

      let linkNames = res.links.map(link => link.name);
      expect(linkNames.length).toEqual(1);
      expect(linkNames.includes('link-site2_0-site3_0'));

      // Unselect ALL links
      act(() => {
        result.current.setPendingTopology([], 'links');
      });

      res = result.current.getPendingTopology();
      siteNames = res.sites.map(site => site.name);
      expect(siteNames.length).toEqual(2);
      expect(siteNames.includes('site1'));
      expect(siteNames.includes('site3'));

      nodeNames = res.nodes.map(node => node.name);
      expect(nodeNames.length).toEqual(0);

      linkNames = res.links.map(link => link.name);
      expect(linkNames.length).toBe(0);
    });
  });
});
