/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MapboxGeocoder from './MapboxGeocoder';
import React from 'react';
import ReactDOM from 'react-dom';
import TgMapboxGeocoderIcon from './TgMapboxGeocoderIcon';
import mapboxgl from 'mapbox-gl';
import {LinkTypeValueMap} from '../../../shared/types/Topology';
import {
  MAP_CONTROL_LOCATIONS,
  TopologyElementType,
} from '../../constants/NetworkConstants';
import {convertType, objectValuesTypesafe} from '../../helpers/ObjectHelpers';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '../../contexts/MapContext';
import {useNetworkContext} from '../../contexts/NetworkContext';

import type {Feature} from './MapboxGeocoderTypes';
import type {LinkMeta, Site} from '../../contexts/NetworkContext';
import type {LinkType, NodeType} from '../../../shared/types/Topology';

const useStyles = makeStyles(() => ({
  listItemIcon: {
    marginRight: 0,
  },
}));

type Props = {
  accessToken: string,
  mapRef: ?mapboxgl.Map,
  onSelectFeature: ($Shape<Feature>) => any,
};

export default function TgMapboxGeocoder(props: Props) {
  const classes = useStyles();
  const {accessToken, mapRef, onSelectFeature} = props;
  const {mapboxRef} = useMapContext();
  const {
    nodeMap,
    linkMap,
    siteMap,
    setSelected,
    networkConfig,
  } = useNetworkContext();
  const statusReports = networkConfig?.status_dump?.statusReports;

  const mapboxControl = React.useMemo(() => {
    const container = document.createElement('div');
    container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    container.setAttribute('data-testid', 'tg-draw-toggle-container');
    return container;
  }, []);

  React.useEffect(() => {
    mapboxRef?.addControl(
      {
        onAdd: _map => {
          return mapboxControl;
        },
        onRemove: () => {},
      },
      MAP_CONTROL_LOCATIONS.TOP_LEFT,
    );
    mapboxRef?.addControl(
      new mapboxgl.NavigationControl({}),
      MAP_CONTROL_LOCATIONS.TOP_LEFT,
    );
  }, [mapboxRef, mapboxControl]);

  const searchInMap = React.useCallback((query, map, filter) => {
    // Performs a case-insensitive substring lookup in the given map
    // TODO - return multiple results?
    if (map.hasOwnProperty(query)) {
      // Has exact match, return it now
      return {el: map[query], matchIdx: 0, matchLen: query.length};
    }

    for (const key in map) {
      if (map.hasOwnProperty(key)) {
        if (filter && !filter(map[key])) {
          continue; // didn't pass custom filter
        }
        const idx = key.toLowerCase().indexOf(query);
        if (idx >= 0) {
          return {el: map[key], matchIdx: idx, matchLen: query.length};
        }
      }
    }
    return {};
  }, []);

  const getCustomResults = React.useCallback(
    originalQuery => {
      // Match the given query to topology elements by name (max one per type).
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
        const {el, matchIdx, matchLen} = searchInMap(query, siteMap);
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
      }
      if (nodeMap) {
        const {el, matchIdx, matchLen} = searchInMap(query, nodeMap);
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

        // Match by MAC address

        const macMatch = objectValuesTypesafe<NodeType>(nodeMap).find(
          node =>
            node.mac_addr.toLowerCase() === query ||
            (node.wlan_mac_addrs &&
              node.wlan_mac_addrs.find(mac => mac.toLowerCase() === query)),
        );
        if (macMatch) {
          const location = siteMap[macMatch.site_name].location;
          addMatch({
            type: TopologyElementType.NODE,
            name: macMatch.name,
            label: originalQuery,
            location,
            matchIdx: 0,
            matchLen: originalQuery.length,
          });
        }

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
        if (!searchResult.el) {
          // No results, so retry with wired links
          searchResult = searchInMap(query, linkMap);
        }

        const {el, matchIdx, matchLen} = searchResult;
        if (el) {
          // Fake location = midpoint of link
          const aNode = nodeMap[convertType<LinkType>(el).a_node_name];
          const zNode = nodeMap[convertType<LinkType>(el).z_node_name];
          const aLocation = siteMap[aNode.site_name].location;
          const zLocation = siteMap[zNode.site_name].location;
          const location = {...aLocation};
          location.latitude = (aLocation.latitude + zLocation.latitude) / 2;
          location.longitude = (aLocation.longitude + zLocation.longitude) / 2;
          addMatch({
            type: TopologyElementType.LINK,
            name: el.name,
            label: el.name,
            location,
            matchIdx,
            matchLen,
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
            onSelectFeature({
              center: [result.location.longitude, result.location.latitude],
            });

            // Clear the search field
            handleClearInput();
          }}>
          <ListItemIcon classes={{root: classes.listItemIcon}}>
            <TgMapboxGeocoderIcon resultType={result.type} />
          </ListItemIcon>
          <ListItemText primary={primaryText} />
        </ListItem>
      );
    },
    [classes, onSelectFeature, setSelected],
  );

  return ReactDOM.createPortal(
    <MapboxGeocoder
      accessToken={accessToken}
      mapRef={mapRef}
      onSelectFeature={onSelectFeature}
      getCustomResults={getCustomResults}
      shouldSearchPlaces={shouldSearchPlaces}
      onRenderResult={onRenderResult}
    />,
    mapboxControl,
  );
}
