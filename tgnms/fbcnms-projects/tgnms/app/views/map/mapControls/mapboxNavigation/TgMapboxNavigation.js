/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MapboxNavigationControl from './MapboxNavigationControl';
import MapboxSearchBar from './MapboxSearchBar';
import React from 'react';
import TgMapboxNavIcon from './TgMapboxNavIcon';
import {LinkTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {TopologyElementType} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {
  convertType,
  objectValuesTypesafe,
} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {
  locToPos,
  locationMidpoint,
} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

import type {LinkMeta, Site} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {LinkType, NodeType} from '@fbcnms/tg-nms/shared/types/Topology';

const useStyles = makeStyles(() => ({
  listItemIcon: {
    marginRight: 0,
  },
}));

export default function TgMapboxNavigation() {
  const classes = useStyles();
  const {moveMapTo} = useMapContext();

  const {
    nodeMap,
    linkMap,
    siteMap,
    setSelected,
    networkConfig,
  } = useNetworkContext();
  const statusReports = networkConfig?.status_dump?.statusReports;

  const searchInMap = React.useCallback((query, map, filter) => {
    // Performs a case-insensitive substring lookup in the given map
    if (map.hasOwnProperty(query)) {
      // Has exact match, return it now
      return [{el: map[query], matchIdx: 0, matchLen: query.length}];
    }

    const results = [];

    for (const key in map) {
      if (map.hasOwnProperty(key)) {
        if (filter && !filter(map[key])) {
          continue; // didn't pass custom filter
        }
        const idx = key.toLowerCase().indexOf(query);
        if (idx >= 0) {
          results.push({el: map[key], matchIdx: idx, matchLen: query.length});
        }
      }
    }
    return results;
  }, []);

  const getCustomResults = React.useCallback(
    originalQuery => {
      // Match the given query to topology elements by name.
      // This performs a case-insensitive substring search, and will return
      // results with the following structure:
      // {
      //   type: TopologyElementType,
      //   name: str,
      //   matchIdx: int,
      //   matchLen: int,
      //   feature: {center: [lng, lat]}},
      // }
      const query = originalQuery.toLowerCase();

      // Push to front if full match, else back
      const matches = [];
      const addMatch = match => {
        if (match.label.length === query.length) {
          matches.unshift(match);
        } else {
          matches.push(match);
        }
      };

      // Search for matching nodes/links/sites
      if (siteMap) {
        searchInMap(query, siteMap).forEach(({el, matchIdx, matchLen}) => {
          if (el) {
            const location = convertType<Site>(el).location;
            addMatch({
              type: TopologyElementType.SITE,
              name: el.name,
              label: el.name,
              location,
              matchIdx,
              matchLen,
            });
          }
        });
      }
      if (nodeMap) {
        searchInMap(query, nodeMap).forEach(({el, matchIdx, matchLen}) => {
          if (el) {
            const location =
              siteMap[convertType<NodeType>(el).site_name].location;
            addMatch({
              type: TopologyElementType.NODE,
              name: el.name,
              label: el.name,
              location,
              matchIdx,
              matchLen,
            });
          }
        });
      }
      if (linkMap) {
        // First, exclude wired links
        let searchResult = searchInMap(
          query,
          linkMap,
          link =>
            convertType<LinkType & LinkMeta>(link).link_type !==
            LinkTypeValueMap.ETHERNET,
        );
        if (searchResult.length === 0) {
          // No results, so retry with wired links
          searchResult = searchInMap(query, linkMap);
        }

        searchResult.forEach(({el, matchIdx, matchLen}) => {
          if (el) {
            // Fake location = midpoint of link
            const aNode = nodeMap[convertType<LinkType>(el).a_node_name];
            const zNode = nodeMap[convertType<LinkType>(el).z_node_name];
            const location = locationMidpoint(
              siteMap[aNode.site_name].location,
              siteMap[zNode.site_name].location,
            );
            addMatch({
              type: TopologyElementType.LINK,
              name: el.name,
              label: el.name,
              location,
              matchIdx,
              matchLen,
            });
          }
        });
      }

      // Match by MAC address
      const macMatch = objectValuesTypesafe<NodeType>(nodeMap).reduce(
        (res, node) => {
          if (node.mac_addr.toLowerCase().includes(query))
            res.push({
              name: node.mac_addr,
              site_name: node.site_name,
              node_name: node.name,
            });
          if (node.wlan_mac_addrs) {
            const wlan_mac_match = node.wlan_mac_addrs.find(mac =>
              mac.toLowerCase().includes(query),
            );
            if (wlan_mac_match) {
              res.push({
                name: wlan_mac_match,
                site_name: node.site_name,
                node_name: node.name,
              });
            }
          }
          return res;
        },
        [],
      );

      macMatch.forEach(nodeMacMatch => {
        const location = siteMap[nodeMacMatch.site_name].location;
        addMatch({
          type: TopologyElementType.NODE,
          name: nodeMacMatch.node_name,
          label: nodeMacMatch.name,
          location,
          matchIdx: 0,
          matchLen: originalQuery.length,
        });
      });

      // Match by IP address
      const ipMatch = statusReports
        ? Object.keys(statusReports).find(
            mac => statusReports[mac].ipv6Address.toLowerCase() === query,
          )
        : null;
      if (ipMatch) {
        const ipMatchNode = objectValuesTypesafe<NodeType>(nodeMap).find(
          node => node.mac_addr === ipMatch,
        );
        if (ipMatchNode) {
          const location = siteMap[ipMatchNode.site_name].location;
          addMatch({
            type: TopologyElementType.NODE,
            name: ipMatchNode.name,
            label: originalQuery,
            location,
            matchIdx: 0,
            matchLen: originalQuery.length,
          });
        }
      }

      return matches;
    },
    [linkMap, nodeMap, searchInMap, siteMap, statusReports],
  );

  const shouldSearchPlaces = React.useCallback(results => {
    // Search for default place results only if we have no custom results
    return results.length === 0;
  }, []);

  const onRenderResult = React.useCallback(
    (result, handleClearInput) => {
      // Render a single result

      // Filter out feature results (rendered in base class)
      if (!result.hasOwnProperty('type')) {
        return null;
      }

      const primaryText = (
        // Bold the matched substring
        <span>
          {result.label.substr(0, result.matchIdx)}
          <strong>
            {result.label.substr(result.matchIdx, result.matchLen)}
          </strong>
          {result.label.substr(result.matchIdx + result.matchLen)}
        </span>
      );

      return (
        <ListItem
          key={result.type + '-' + result.label}
          button
          dense
          onClick={() => {
            // Selected a topology element
            if (setSelected) {
              setSelected(result.type, result.name);
            }
            moveMapTo({
              center: locToPos(result.location),
            });

            // Clear the search field
            handleClearInput();
          }}>
          <ListItemIcon classes={{root: classes.listItemIcon}}>
            <TgMapboxNavIcon resultType={result.type} />
          </ListItemIcon>
          <ListItemText primary={primaryText} />
        </ListItem>
      );
    },
    [classes, moveMapTo, setSelected],
  );

  return (
    <>
      <MapboxSearchBar
        onSelectFeature={moveMapTo}
        getCustomResults={getCustomResults}
        shouldSearchPlaces={shouldSearchPlaces}
        onRenderResult={onRenderResult}
      />
      <MapboxNavigationControl />
    </>
  );
}
