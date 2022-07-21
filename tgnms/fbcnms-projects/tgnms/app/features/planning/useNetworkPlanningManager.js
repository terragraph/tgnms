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
import {filterANPTopology, getEnabledStatusKeys} from './PlanningHelpers';
import {makeLinkName} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {parseANPJson} from '@fbcnms/tg-nms/app/helpers/TopologyTemplateHelpers';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import type {
  ANPLink,
  ANPUploadTopologyType,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants';

export type PendingTopologyType = 'sites' | 'links';

export function useNetworkPlanningManager() {
  const {
    planTopology,
    mapOptions,
    _pendingTopology,
    _setPendingTopology,
    _pendingTopologyCount,
    _setPendingTopologyCount,
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

    // The ANP plan may contains duplicate for some links but not all.
    // It doesn't matter which we choose because they'll be
    // normalized in parseANPJson to be the correct format (i.e. node
    // ordering). So we'll just choose the first seen one.
    const newLinks: {[string]: ANPLink} = {};
    const seen = new Set();
    for (const key of Object.keys(res.links || [])) {
      const link = res.links[key];
      const linkName = makeLinkName(link.rx_sector_id, link.tx_sector_id);

      if (!seen.has(linkName)) {
        newLinks[key] = link;
        seen.add(linkName);
      }
    }
    return {...res, links: newLinks};
  }, [planTopology, mapOptions]);

  // Sets the sites/links in the pendingTopology.
  // (i.e. _pendingTopology which is a very lean version of what's been
  // selected for commit)
  const setPendingTopology = React.useCallback(
    ({sites, links}: {sites?: string[], links?: string[]}) => {
      _setPendingTopology(prevPendingTopology => {
        // If no sites/links were passed in, assume we are using
        // the previous one.
        sites = sites ?? Array.from(prevPendingTopology.sites);
        links = links ?? Array.from(prevPendingTopology.links);

        _setPendingTopologyCount(sites.length + links.length);

        // Add in sites required by links.
        const additionalSites = [];
        for (const link_id of links) {
          const link = filteredTopology.links[link_id];
          additionalSites.push(link.tx_site_id);
          additionalSites.push(link.rx_site_id);
        }

        return {
          links: new Set<string>(links),
          sites: new Set<string>([...sites, ...additionalSites]),
        };
      });
    },
    [filteredTopology, _setPendingTopology, _setPendingTopologyCount],
  );

  const appendPendingTopology = React.useCallback(
    (elements: string[], type: PendingTopologyType) => {
      const newSelection = new Set<string>([
        ..._pendingTopology[type],
        ...elements,
      ]);
      setPendingTopology({[(type: string)]: Array.from(newSelection)});
    },
    [_pendingTopology, setPendingTopology],
  );

  // 1. When removing a link, the sites that were added would be removed
  //    unless there are other links going to that site.
  // 2. If you manually deselect a site that has a link going from it,
  //    then the link(s) from that site get deselected but the sites on
  //    the other end of the link stay.
  const removeFromPendingTopology = React.useCallback(
    (elements: string[], type: PendingTopologyType) => {
      let newLinks, newSites;
      const toBeRemoved = new Set(elements);
      if (type === 'links') {
        newLinks = [..._pendingTopology.links].filter(
          id => !toBeRemoved.has(id),
        );
        // Remove the sites associated with the link too.
        // Sites required by newLinks are re-added in
        // setPendingTopology
        newSites = new Set([..._pendingTopology.sites]);
        for (const link_id of toBeRemoved) {
          const link = filteredTopology.links[link_id];
          newSites.delete(link.tx_site_id);
          newSites.delete(link.rx_site_id);
        }
      } else {
        newSites = [..._pendingTopology.sites].filter(
          id => !toBeRemoved.has(id),
        );
        // Remove any link connected to that site.
        newLinks = new Set([..._pendingTopology.links]);
        for (const link_id of _pendingTopology.links) {
          const link = filteredTopology.links[link_id];
          if (
            toBeRemoved.has(link.tx_site_id) ||
            toBeRemoved.has(link.rx_site_id)
          ) {
            newLinks.delete(link_id);
          }
        }
      }
      setPendingTopology({
        links: Array.from(newLinks),
        sites: Array.from(newSites),
      });
    },
    [_pendingTopology, setPendingTopology, filteredTopology],
  );

  const isInPendingTopology = React.useCallback(
    (element: string, type: PendingTopologyType) =>
      _pendingTopology[type].has(element),
    [_pendingTopology],
  );

  // Gets the full set of nodes/links/sites derived from the
  // pendingTopology.
  //
  // This will return the NEW topology elements that will be
  // added to the network.
  const getTopologyToCommit = React.useCallback(() => {
    const result: ANPUploadTopologyType = {
      sites: {},
      nodes: {}, // not used in this section
      sectors: {},
      links: {},
    };
    let pendingTopology;
    if (_pendingTopologyCount == 0) {
      // If nothing is selected, default to all elements.
      pendingTopology = {
        links: new Set(Object.keys(filteredTopology.links)),
        sites: new Set(Object.keys(filteredTopology.sites)),
      };
    } else {
      pendingTopology = _pendingTopology;
    }

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
    };

    // Add sites.
    for (const site_id of pendingTopology.sites) addSite(site_id);

    // Add links.
    for (const link_id of pendingTopology.links) {
      const link = filteredTopology.links[link_id];
      result.links[link_id] = link;
      // Add sites connected to the link.
      addSite(link.rx_site_id);
      addSite(link.tx_site_id);
      // Add sectors connected to the link.
      result.sectors[link.rx_sector_id] =
        filteredTopology.sectors[link.rx_sector_id];
      result.sectors[link.tx_sector_id] =
        filteredTopology.sectors[link.tx_sector_id];
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
    _pendingTopologyCount,
    filteredTopology,
    mapOptions.enabledStatusTypes,
    currentNodes,
    currentLinks,
    currentSites,
  ]);

  return {
    pendingTopology: _pendingTopology,
    pendingTopologyCount: _pendingTopologyCount,
    filteredTopology,
    appendPendingTopology,
    setPendingTopology,
    removeFromPendingTopology,
    isInPendingTopology,
    getTopologyToCommit,
  };
}
