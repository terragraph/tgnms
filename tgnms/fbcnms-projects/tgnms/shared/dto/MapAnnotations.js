/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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

/**
 * Most customizable things on an annotation come from its GeoJSON Properties.
 * Be careful modifying these types, they're queried by mapbox-gl-js
 * style expressions.
 */
export type AnnotationProperties = {|
  name: string,
  showName: boolean,
  color: string,
  opacity: ?number,
|};
