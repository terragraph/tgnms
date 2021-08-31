/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {PLANNING_BASE_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {Route} from 'react-router-dom';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockUploadANPJson} from '@fbcnms/tg-nms/app/tests/data/UploadTopology';
import {renderHook} from '@testing-library/react-hooks';
import {useNetworkPlanningManager} from '../PlanningHooks';

describe('useNetworkPlanningManager', () => {
  test('should update selectedTopology', async () => {
    const folder1Path = PLANNING_BASE_PATH + '/folder/1';

    const wrapper = ({children}) => (
      <TestApp route={folder1Path}>
        <NetworkPlanningContextProvider
          planTopology={JSON.parse(mockUploadANPJson())}
          mapOptions={{
            enabledStatusTypes: {
              PROPOSED: false,
              UNAVAILABLE: false,
              CANDIDATE: true,
            },
          }}>
          <Route path={PLANNING_BASE_PATH} render={() => children} />
        </NetworkPlanningContextProvider>
      </TestApp>
    );

    const {result} = renderHook(() => useNetworkPlanningManager(), {
      wrapper,
    });
    expect(result.current.selectedTopology.sites.length).toEqual(1);
  });
});
