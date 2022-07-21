/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

/*
 * Customizes NetworkTestExecutionsTable to be used outside of NetworkTestView
 */

import React, {useCallback} from 'react';
import ScanService from '@fbcnms/tg-nms/app/features/scans/components/ScanService';
import useRouter from '@fbcnms/ui/hooks/useRouter';
import {MAPMODE, useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {SCHEDULE_TABLE_TYPES} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {createMapLink} from '@fbcnms/tg-nms/app/helpers/ScheduleHelpers';
import {getTestOverlayId} from '@fbcnms/tg-nms/app/features/network_test/NetworkTestHelpers';

export default function ScanTable() {
  const {match, location} = useRouter();
  const {networkName} = match.params;
  const {setMapMode} = useMapContext();

  const createScanUrl = useCallback(
    ({executionId}) => {
      const url = new URL(
        createMapLink({
          executionId,
          networkName,
          type: SCHEDULE_TABLE_TYPES.SCAN,
        }),
        window.location.origin,
      );
      url.search = location.search;
      if (executionId) {
        url.searchParams.set('scan', executionId);
        url.searchParams.set('mapMode', MAPMODE.SCAN_SERVICE);
      }
      setMapMode(MAPMODE.SCAN_SERVICE);
      // can't use an absolute url in react-router
      return `${url.pathname}${url.search}`;
    },
    [location.search, networkName, setMapMode],
  );
  return (
    <ScanService
      createScanUrl={createScanUrl}
      networkName={networkName}
      selectedExecutionId={getTestOverlayId(location)}
    />
  );
}
