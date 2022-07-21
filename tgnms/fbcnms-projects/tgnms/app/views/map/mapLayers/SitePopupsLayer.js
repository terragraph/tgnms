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
import {Popup} from 'react-mapbox-gl';
import {locToPos} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

export default function SitePopupsLayer() {
  const {networkConfig} = useNetworkContext();
  return networkConfig.topology.sites.map<React.Node>(site => (
    <Popup key={'popup-' + site.name} coordinates={locToPos(site.location)}>
      <div>{site.name}</div>
    </Popup>
  ));
}
