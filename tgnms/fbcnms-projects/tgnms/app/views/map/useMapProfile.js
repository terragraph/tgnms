/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import {DEFAULT_MAP_PROFILE} from '@fbcnms/tg-nms/app/constants/MapProfileConstants';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {MapProfile} from '@fbcnms/tg-nms/shared/dto/MapProfile';

export default function useMapProfile(): MapProfile {
  const {networkName} = useNetworkContext();
  const {mapProfiles} = useMapContext();
  return React.useMemo(() => {
    const mapProfile = mapProfiles.find(p =>
      p?.networks?.some(netName => netName === networkName),
    );
    if (mapProfile != null) {
      return mapProfile;
    }
    return DEFAULT_MAP_PROFILE;
  }, [networkName, mapProfiles]);
}

export function useShowCustomOverlayPanel(): boolean {
  const mapProfile = useMapProfile();
  const showCustomOverlaysTab =
    (mapProfile?.data?.remoteOverlays?.length ?? 0) > 0;
  return showCustomOverlaysTab;
}
