/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 * Customizes NetworkTestExecutionsTable to be used outside of NetworkTestView
 */

import NetworkTest from '../network_test/NetworkTest';
import React, {useCallback} from 'react';
import useRouter from '@fbcnms/ui/hooks/useRouter';
import {MAPMODE, useMapContext} from '../../contexts/MapContext';
import {SCHEDULE_TABLE_TYPES} from '../../constants/ScheduleConstants';
import {createMapLink} from '../../helpers/ScheduleHelpers';
import {getTestOverlayId} from '../../helpers/NetworkTestHelpers';

export default function NetworkTestTable() {
  const {match, location} = useRouter();
  const {networkName} = match.params;
  const {setMapMode} = useMapContext();

  const createTestUrl = useCallback(
    ({executionId}) => {
      const url = new URL(
        createMapLink({
          executionId,
          networkName,
          type: SCHEDULE_TABLE_TYPES.TEST,
        }),
        window.location.origin,
      );
      url.search = location.search;
      if (executionId) {
        url.searchParams.set('test', executionId);
        url.searchParams.set('mapMode', MAPMODE.NETWORK_TEST);
      }
      setMapMode(MAPMODE.NETWORK_TEST);
      // can't use an absolute url in react-router
      return `${url.pathname}${url.search}`;
    },
    [location.search, networkName, setMapMode],
  );
  return (
    <NetworkTest
      createTestUrl={createTestUrl}
      networkName={networkName}
      selectedExecutionId={getTestOverlayId(location)}
    />
  );
}
