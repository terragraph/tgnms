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

  const setupHook = () =>
    renderHook(() => useNetworkPlanningManager(), {
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

  beforeEach(() => {
    _planTopology = JSON.parse(
      mockUploadANPJson(__dirname, 'planning_mock_ANP.json'),
    );
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
      expect(links.length).toEqual(2);
      expect(links.includes('link20_30')).toBeTruthy();
      expect(links.includes('link20_30_duplicate')).toBeFalsy();
    });
  });

  describe('setPendingTopology', () => {
    test('should work with link and site selections', () => {
      const {result} = setupHook();

      // Select site1 and site3
      act(() => {
        result.current.setPendingTopology({sites: ['site1', 'site3']});
      });

      let res = result.current.pendingTopology;
      let siteNames = res.sites;
      expect(siteNames.size).toEqual(2);
      expect(siteNames.has('site1'));
      expect(siteNames.has('site3'));

      let linkNames = res.links;
      expect(linkNames.size).toBe(0);

      // Select link from node 20 to node 30
      act(() => {
        result.current.setPendingTopology({links: ['link20_30']});
      });

      res = result.current.pendingTopology;
      siteNames = res.sites;
      expect(siteNames.size).toEqual(3);
      expect(siteNames.has('site1')); // site1 still here from the prev selection
      expect(siteNames.has('site2'));
      expect(siteNames.has('site3'));

      linkNames = res.links;
      expect(linkNames.size).toEqual(1);
      expect(linkNames.has('link-site2_0-site3_0'));
    });
    test('when unselecting all sites, should still add in all necessary sites for links', () => {
      const {result} = setupHook();
      // Select site1
      act(() => {
        result.current.setPendingTopology({sites: ['site1']});
      });
      // Select link from node 20 to node 30
      act(() => {
        result.current.setPendingTopology({links: ['link20_30']});
      });

      let res = result.current.pendingTopology;
      let siteNames = res.sites;
      expect(siteNames.size).toEqual(3);
      expect(siteNames.has('site1'));
      expect(siteNames.has('site2'));
      expect(siteNames.has('site3'));

      let linkNames = res.links;
      expect(linkNames.size).toEqual(1);
      expect(linkNames.has('link-site2_0-site3_0'));

      // Don't selected any sites
      act(() => {
        result.current.setPendingTopology({sites: []});
      });

      // Sites file should still have the necessary sites
      res = result.current.pendingTopology;
      siteNames = res.sites;
      expect(siteNames.size).toEqual(2);
      expect(siteNames.has('site2'));
      expect(siteNames.has('site3'));

      linkNames = res.links;
      expect(linkNames.size).toEqual(1);
      expect(linkNames.has('link-site2_0-site3_0'));
    });
  });

  describe('getTopologyToCommit', () => {
    test('should work with link and site selections', () => {
      const {result} = setupHook();

      // Select link from node 20 to node 30
      act(() => {
        result.current.setPendingTopology({links: ['link20_30']});
      });

      const res = result.current.getTopologyToCommit();
      const siteNames = res.sites.map(site => site.name);
      expect(siteNames.length).toEqual(2);
      expect(siteNames.includes('site2'));
      expect(siteNames.includes('site3'));

      const nodeNames = res.nodes.map(node => node.name);
      expect(nodeNames.length).toEqual(2);
      expect(nodeNames.includes('site2_0'));
      expect(nodeNames.includes('site3_0'));

      const linkNames = res.links.map(link => link.name);
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
        result.current.setPendingTopology({links: ['link20_30']});
      });

      const res = result.current.getTopologyToCommit();
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
  });

  describe('appendPendingTopology', () => {
    test('should work with link and site appends', () => {
      const {result} = setupHook();

      act(() => {
        result.current.appendPendingTopology(['site1'], 'sites');
      });
      let res = result.current.pendingTopology;
      let siteNames = res.sites;
      expect(siteNames.size).toEqual(1);
      expect(siteNames.has('site1'));

      act(() => {
        result.current.appendPendingTopology(['site2'], 'sites');
      });
      res = result.current.pendingTopology;
      siteNames = res.sites;
      expect(siteNames.size).toEqual(2);
      expect(siteNames.has('site1'));
      expect(siteNames.has('site2'));

      // Select link from node 20 to node 30
      act(() => {
        result.current.appendPendingTopology(['link20_30'], 'links');
      });

      res = result.current.pendingTopology;
      siteNames = res.sites;
      expect(siteNames.size).toEqual(3);
      expect(siteNames.has('site1'));
      expect(siteNames.has('site2'));
      expect(siteNames.has('site3'));

      const linkNames = res.links;
      expect(linkNames.size).toEqual(1);
      expect(linkNames.has('link-site2_0-site3_0'));
    });
  });

  describe('removeFromPendingTopology', () => {
    test('remove link should remove its sites', () => {
      const {result} = setupHook();

      act(() => {
        result.current.appendPendingTopology(['link20_30'], 'links');
      });
      // Sanity check
      let res = result.current.pendingTopology;
      expect(res.sites.size).toEqual(2);
      expect(res.links.size).toEqual(1);

      act(() => {
        result.current.removeFromPendingTopology(['link20_30'], 'links');
      });
      // Should remove two sites and 1 link.
      res = result.current.pendingTopology;
      expect(res.sites.size).toEqual(0);
      expect(res.links.size).toEqual(0);
    });
    test('remove site should remove its links', () => {
      const {result} = setupHook();

      act(() => {
        result.current.appendPendingTopology(
          ['link20_30', 'link10_30'],
          'links',
        );
      });
      // Sanity check
      let res = result.current.pendingTopology;
      expect(res.sites.size).toEqual(3);
      expect(res.links.size).toEqual(2);

      act(() => {
        result.current.removeFromPendingTopology(['site2'], 'sites');
      });
      res = result.current.pendingTopology;
      expect(res.sites.size).toEqual(2);
      expect(res.sites.has('site1'));
      expect(res.sites.has('site3'));
      expect(res.links.size).toEqual(1);
    });
  });
});
