/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import {filterANPTopology, getEnabledStatusKeys} from './PlanningHelpers';
import {parseANPJson} from '@fbcnms/tg-nms/app/helpers/TopologyTemplateHelpers';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import type {ANPUploadTopologyType} from '@fbcnms/tg-nms/app/constants/TemplateConstants';

export type PendingTopologyElement = {id: string};

export function useNetworkPlanningManager() {
  const {
    planTopology,
    mapOptions,
    _pendingTopology,
    _setPendingTopology,
  } = useNetworkPlanningContext();

  // Gather the current topology.
  // Used to determine which elements are ALREADY on the network.
  const {nodeMap, linkMap, siteMap} = useNetworkContext();
  const currentNodes = React.useMemo(
    () => new Set<string>(Object.keys(nodeMap)),
    [nodeMap],
  );
  const currentLinks = React.useMemo(
    () => new Set<string>(Object.keys(linkMap)),
    [linkMap],
  );
  const currentSites = React.useMemo(
    () => new Set<string>(Object.keys(siteMap)),
    [siteMap],
  );

  // Represents the topology that is visible on the map.
  // The pending topology should be a subset of what's on the map.
  const filteredTopology = React.useMemo(() => {
    const res = filterANPTopology(planTopology, mapOptions);
    return res;
  }, [planTopology, mapOptions]);

  // Setter for the internal(?) version of pendingTopology
  // (i.e. _pendingTopology which is a very lean version of what's been
  // selected for commit)
  const setPendingTopology = React.useCallback(
    (elements: PendingTopologyElement[], type: 'sites' | 'links') => {
      const res = new Set<string>(elements.map(e => e.id));
      _setPendingTopology({..._pendingTopology, [(type: string)]: res});
    },
    [_pendingTopology, _setPendingTopology],
  );

  // Getter for the internal(?) version of pendingTopology
  // (i.e. _pendingTopology which is a very lean version of what's been
  // selected for commit)
  //
  // This will return the NEW topology elements that will be added to
  // the network.
  const getPendingTopology = React.useCallback(() => {
    const result: ANPUploadTopologyType = {
      sites: {},
      nodes: {}, // not used in this section
      sectors: {},
      links: {},
    };

    // Map from sites to sectors (aka nodes).
    const sitesToSectors = {};
    Object.keys(filteredTopology.sites).forEach(
      site_id => (sitesToSectors[site_id] = new Set<string>()),
    );
    Object.keys(filteredTopology.sectors).forEach(sector_id =>
      sitesToSectors[filteredTopology.sectors[sector_id].site_id].add(
        sector_id,
      ),
    );

    const addSite = site_id => {
      const site = filteredTopology.sites[site_id];
      result.sites[site_id] = site;

      // Add all sectors on the site.
      sitesToSectors[site_id].forEach(
        sector_id =>
          (result.sectors[sector_id] = filteredTopology.sectors[sector_id]),
      );
    };

    // Add sites.
    for (const site_id of _pendingTopology.sites) addSite(site_id);

    // Add links.
    for (const link_id of _pendingTopology.links) {
      const link = filteredTopology.links[link_id];
      result.links[link_id] = link;
      // Add sites connected to the link.
      addSite(link.rx_site_id);
      addSite(link.tx_site_id);
    }

    const res = parseANPJson(
      result,
      getEnabledStatusKeys(mapOptions.enabledStatusTypes),
      {
        nodes: currentNodes,
        links: currentLinks,
        sites: currentSites,
      },
    );
    return res;
  }, [
    _pendingTopology,
    filteredTopology,
    mapOptions.enabledStatusTypes,
    currentNodes,
    currentLinks,
    currentSites,
  ]);

  const result = React.useMemo(
    () => ({
      filteredTopology,
      setPendingTopology,
      getPendingTopology,
    }),
    [filteredTopology, setPendingTopology, getPendingTopology],
  );
  return result;
}
