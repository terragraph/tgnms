/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import {Popup} from 'react-mapbox-gl';
import {locToPos} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {useNetworkContext} from '../../../contexts/NetworkContext';

export default function SitePopupsLayer() {
  const {networkConfig} = useNetworkContext();
  return networkConfig.topology.sites.map<React.Node>(site => (
    <Popup key={'popup-' + site.name} coordinates={locToPos(site.location)}>
      <div>{site.name}</div>
    </Popup>
  ));
}
