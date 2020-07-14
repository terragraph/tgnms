/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {GeoFeatureCollection} from '@turf/turf';

/**
 * Identification info about a map annotation group.
 * id is non-nullable because this is meant to come from the database
 */
export type MapAnnotationGroupIdent = {|
  id: number,
  topologyName: string,
  name: string,
|};

export type MapAnnotationGroup = {|
  ...MapAnnotationGroupIdent,
  geojson: GeoFeatureCollection,
|};

// HTTP request json sent to update/create an annotation group
export type SaveAnnotationGroupRequest = {|
  id?: number,
  name: string,
  geojson: string,
|};
