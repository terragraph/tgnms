/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as turf from '@turf/turf';
import NetworkContext from '../../../contexts/NetworkContext';
import React from 'react';
import useLiveRef from '../../../hooks/useLiveRef';
import {Layer, Source} from 'react-mapbox-gl';
import {LinkTypeValueMap as LinkType} from '../../../../shared/types/Topology';
import {TopologyElementType} from '../../../constants/NetworkConstants';
import {handleLayerMouseEnter, handleLayerMouseLeave} from './helpers';
import {mapboxShouldAcceptClick} from '../../../helpers/NetworkHelpers';
import {objectValuesTypesafe} from '../../../helpers/ObjectHelpers';
import {useMapContext} from '../../../contexts/MapContext';

import type {FeatureId, GeoFeature} from '@turf/turf';
import type {
  LinkType as Link,
  NodeType as Node,
} from '../../../../shared/types/Topology';

export default function NodesLayer() {
  return <NodeAzimuthIcons />;
}

export const BEARING_PROP = 'bearing';
export const BORESIGHT_IMAGE_ID = 'boresight';
export const BORESIGHT_IMAGE_PATH = '/static/images/map/boresight.png';
export const SOURCE_ID = 'nodes';
export const LAYER_ID = 'nodes-azimuth';

function NodeAzimuthIcons() {
  const {
    nodeMap,
    siteMap,
    linkMap,
    nodeToLinksMap,
    setSelected,
    selectedElement,
  } = React.useContext(NetworkContext);
  /**
   * Prevent geojson from being recomputed needlessly.
   * Since the topology maps break reference equality with every topology pull,
   * the memoization function will re-run every few seconds. Caveat: if
   * the topology is changed, the new sector will not show without a refresh.
   */
  const topologyMapsRef = useLiveRef({
    nodeMap,
    siteMap,
    linkMap,
    nodeToLinksMap,
  });
  const {mapboxRef} = useMapContext();
  React.useEffect(() => {
    async function loadImage() {
      if (mapboxRef && !mapboxRef.hasImage(BORESIGHT_IMAGE_ID)) {
        const image = await new Promise((res, rej) =>
          mapboxRef.loadImage(BORESIGHT_IMAGE_PATH, (err, image) =>
            err ? rej(err) : res(image),
          ),
        );
        mapboxRef.addImage(BORESIGHT_IMAGE_ID, image);
      }
    }
    loadImage();
  }, [mapboxRef]);
  const geoJson = React.useMemo(() => {
    const {nodeMap, siteMap, linkMap, nodeToLinksMap} = topologyMapsRef.current;
    const features = objectValuesTypesafe<Node>(nodeMap).map((node, idx) => {
      const {location} = siteMap[node.site_name];
      const feature = turf.point(
        [location.longitude, location.latitude, location.altitude],
        {
          ...node,
        },
        {id: idx},
      );
      let bearing: number = 0;
      if (
        typeof node.ant_azimuth === 'number' &&
        !isNaN(node.ant_azimuth) &&
        node.ant_azimuth !== 0
      ) {
        bearing = node.ant_azimuth;
      } else {
        const links: Array<Link> = [];
        for (const linkName of Array.from(nodeToLinksMap[node.name] || [])) {
          const link = linkMap[linkName];
          if (link.link_type === LinkType.WIRELESS) {
            links.push(link);
          }
        }
        if (links.length < 1) {
          return feature;
        }
        // only show first link, no averaging
        const link1 = links[0];
        const otherNode =
          nodeMap[
            link1.a_node_name === node.name
              ? link1.z_node_name
              : link1.a_node_name
          ];
        const otherSiteLocation = siteMap[otherNode.site_name].location;
        // Calculate bearing to rotate the icon along the link
        bearing = turf.bearing(
          [location.longitude, location.latitude, location.altitude],
          [
            otherSiteLocation.longitude,
            otherSiteLocation.latitude,
            otherSiteLocation.altitude,
          ],
        );
      }

      feature.properties[BEARING_PROP] = bearing;
      return feature;
    });
    const featureCollection = turf.featureCollection(features);
    return featureCollection;
  }, [topologyMapsRef]);

  const selectionRef = React.useRef<?FeatureId>();
  const selectFeature = React.useCallback(
    (feature: ?GeoFeature) => {
      // deselect previous
      if (typeof selectionRef?.current === 'number') {
        mapboxRef?.setFeatureState(
          {source: SOURCE_ID, id: selectionRef.current},
          {selected: false},
        );
      }

      // set new feature as selected
      if (feature) {
        const id = feature.id;
        mapboxRef?.setFeatureState(
          {source: SOURCE_ID, id: id},
          {selected: true},
        );
        selectionRef.current = id;
      } else {
        selectionRef.current = null;
      }
    },
    [mapboxRef, selectionRef],
  );

  // keep mapbox's selected states in-sync with selectedElement
  React.useEffect(() => {
    if (!geoJson) {
      return;
    }
    if (selectedElement?.type !== TopologyElementType.NODE) {
      return selectFeature(null);
    }
    const feature = (geoJson.features ?? []).find(
      f => f?.properties?.name === selectedElement?.name,
    );
    selectFeature(feature);
  }, [selectedElement, selectFeature, geoJson]);
  return (
    <>
      <Source
        id={SOURCE_ID}
        geoJsonSource={{type: 'geojson', data: geoJson, generateId: true}}
      />
      <Layer
        id={LAYER_ID}
        before="site-layer"
        type="symbol"
        sourceId={SOURCE_ID}
        minZoom={10}
        layout={{
          'icon-image': BORESIGHT_IMAGE_ID,
          'icon-size': 0.2,
          'icon-rotate': ['get', BEARING_PROP],
          'icon-anchor': 'bottom',
          'icon-offset': [0, 0],
          'icon-allow-overlap': true,
        }}
        paint={{
          'icon-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            1.0,
            0.5,
          ],
        }}
        onMouseEnter={handleLayerMouseEnter}
        onMouseLeave={handleLayerMouseLeave}
        onClick={mapboxEvent => {
          if (!mapboxEvent.features || !mapboxShouldAcceptClick(mapboxEvent)) {
            return;
          }

          const feature = mapboxEvent.features[0];
          if (!(feature && feature.properties)) {
            return;
          }
          const {name} = feature.properties;
          if (name) {
            setSelected(TopologyElementType.NODE, name);
          }
        }}
      />
    </>
  );
}
