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
import {MAPMODE, useMapContext} from '../../contexts/MapContext';
import {SCHEDULE_TABLE_TYPES} from '../../constants/ScheduleConstants';
import {createMapLink} from '../../helpers/ScheduleHelpers';
import {getTestOverlayId} from '../../helpers/NetworkTestHelpers';
import {useRouter} from '../../../../../fbcnms-packages/fbcnms-ui/hooks/index';

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
