/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 * Customizes NetworkTestExecutionsTable to be used outside of NetworkTestView
 */

import React, {useCallback} from 'react';
import ScanService from '../scan_service/ScanService';
import useRouter from '@fbcnms/ui/hooks/useRouter';
import {MAPMODE, useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {SCHEDULE_TABLE_TYPES} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {createMapLink} from '@fbcnms/tg-nms/app/helpers/ScheduleHelpers';
import {getTestOverlayId} from '@fbcnms/tg-nms/app/helpers/NetworkTestHelpers';

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
