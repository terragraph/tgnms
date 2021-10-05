/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as mockManager from '@fbcnms/tg-nms/app/features/planning/useNetworkPlanningManager';
import TopologyTable from '../TopologyTable';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {PLANNING_PLAN_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {TestApp, renderAsync} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent} from '@testing-library/react';
import {mockUploadANPJson} from '@fbcnms/tg-nms/app/tests/data/UploadTopology';

describe('TopologyTable', () => {
  let planTopology;

  beforeEach(() => {
    planTopology = JSON.parse(
      mockUploadANPJson(__dirname, 'network_planning_mock_ANP.json'),
    );
  });

  test('should load component and display data', async () => {
    const {getByText} = await renderAsync(
      <TestApp route={PLANNING_PLAN_PATH}>
        <NetworkPlanningContextProvider
          plan={{
            id: 1,
            folderId: 1,
            name: 'plan 1',
            state: 'SUCCESS',
          }}
          planTopology={planTopology}
          setPlanTopology={() => {}}>
          <TopologyTable />
        </NetworkPlanningContextProvider>
      </TestApp>,
    );
    act(() => {
      fireEvent.click(getByText('Sites'));
    });
    expect(getByText('site1')).toBeInTheDocument();
  });

  test('the pending topology elements should be checked on load', async () => {
    jest.spyOn(mockManager, 'useNetworkPlanningManager').mockReturnValue({
      filteredTopology: planTopology,
      rawPendingTopology: {
        sites: new Set<string>(['site1', 'site2']),
        links: new Set<string>(['link10_20']),
      },
    });
    const {getByText} = await renderAsync(
      <TestApp route={PLANNING_PLAN_PATH}>
        <NetworkPlanningContextProvider
          plan={{
            id: 1,
            folderId: 1,
            name: 'plan 1',
            state: 'SUCCESS',
          }}
          planTopology={planTopology}
          setPlanTopology={() => {}}>
          <TopologyTable />
        </NetworkPlanningContextProvider>
      </TestApp>,
    );
    act(() => {
      fireEvent.click(getByText('Sites'));
    });
    expect(getByText('2 row(s) selected')).toBeInTheDocument();
    act(() => {
      fireEvent.click(getByText('Links'));
    });
    expect(getByText('1 row(s) selected')).toBeInTheDocument();
  });
});
