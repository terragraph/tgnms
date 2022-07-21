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
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import {getTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {
  HardwareProfile,
  HardwareProfiles,
} from '@fbcnms/tg-nms/shared/dto/HardwareProfiles';

export type HardwareProfilesHook = {|
  getProfileByNodeName: (name: string) => ?HardwareProfile,
  profiles: HardwareProfiles,
|};

export function useHardwareProfiles() {
  const networkCtx = useNetworkContext();
  const {hardwareProfiles, networkConfig} = networkCtx;
  const topologyMapsRef = useLiveRef(getTopologyMaps(networkCtx));

  const getProfileByNodeName = React.useCallback(
    (nodeName: string) => {
      if (!hardwareProfiles) {
        return null;
      }
      const node = topologyMapsRef.current.nodeMap[nodeName];
      if (node == null) {
        return null;
      }
      const hwBoardId =
        networkConfig.status_dump?.statusReports[node.mac_addr]
          ?.hardwareBoardId ?? 'default';
      const profile = hardwareProfiles[hwBoardId];
      return profile;
    },
    [hardwareProfiles, topologyMapsRef, networkConfig],
  );
  const val = React.useRef({});
  Object.assign(val.current, {
    getProfileByNodeName: getProfileByNodeName,
    profiles: hardwareProfiles,
  });
  return val.current;
}
