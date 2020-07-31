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
import TgMapboxGeocoderIcon from './TgMapboxGeocoderIcon';
import mapboxgl from 'mapbox-gl';
import {LinkTypeValueMap} from '../../../shared/types/Topology';
import {TopologyElementType} from '../../constants/NetworkConstants';
import {convertType, objectValuesTypesafe} from '../../helpers/ObjectHelpers';
import {withStyles} from '@material-ui/core/styles';

import type {Feature} from './MapboxGeocoderTypes';
import type {
  LinkMap,
  LinkMeta,
  NodeMap,
  Site,
  SiteMap,
} from '../../contexts/NetworkContext';
import type {LinkType, NodeType} from '../../../shared/types/Topology';
import type {StatusReportType} from '../../../shared/types/Controller';

const styles = {
  listItemIcon: {
    marginRight: 0,
  },
};

type Props = {
  classes: {[string]: string},
  accessToken: string,
  mapRef: ?mapboxgl.Map,
  onSelectFeature: ($Shape<Feature>) => any,
  onSelectTopologyElement: (string, string) => any,
  nodeMap: NodeMap,
  linkMap: LinkMap,
  siteMap: SiteMap,
  statusReports: ?{[string]: StatusReportType},
};

class TgMapboxGeocoder extends React.Component<Props> {
  searchInMap(query, map, filter) {
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
  }

  getCustomResults = originalQuery => {
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
    const {nodeMap, linkMap, siteMap, statusReports} = this.props;
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
      const {el, matchIdx, matchLen} = this.searchInMap(query, siteMap);
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
      const {el, matchIdx, matchLen} = this.searchInMap(query, nodeMap);
      if (el) {
        const location = siteMap[convertType<NodeType>(el).site_name].location;
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
      let searchResult = this.searchInMap(
        query,
        linkMap,
        link =>
          convertType<LinkType & LinkMeta>(link).link_type !==
          LinkTypeValueMap.ETHERNET,
      );
      if (!searchResult.el) {
        // No results, so retry with wired links
        searchResult = this.searchInMap(query, linkMap);
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
  };

  shouldSearchPlaces = results => {
    // Search for default place results only if we have no custom results
    return results.length === 0;
  };

  onRenderResult = (result, handleClearInput) => {
    // Render a single result
    const {classes, onSelectFeature, onSelectTopologyElement} = this.props;

    // Filter out feature results (rendered in base class)
    if (!result.hasOwnProperty('type')) {
      return null;
    }

    const primaryText = (
      // Bold the matched substring
      <span>
        {result.label.substr(0, result.matchIdx)}
        <strong>{result.label.substr(result.matchIdx, result.matchLen)}</strong>
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
          if (onSelectTopologyElement) {
            onSelectTopologyElement(result.type, result.name);
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
  };

  render() {
    const {accessToken, mapRef, onSelectFeature} = this.props;

    return (
      <MapboxGeocoder
        accessToken={accessToken}
        mapRef={mapRef}
        onSelectFeature={onSelectFeature}
        getCustomResults={this.getCustomResults}
        shouldSearchPlaces={this.shouldSearchPlaces}
        onRenderResult={this.onRenderResult}
      />
    );
  }
}

export default withStyles(styles)(TgMapboxGeocoder);
