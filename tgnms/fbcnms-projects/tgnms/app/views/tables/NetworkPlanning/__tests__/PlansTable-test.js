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
import * as networkPlanningAPIUtilMock from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import NetworkPlanningPanel from '@fbcnms/tg-nms/app/views/map/mappanels/NetworkPlanningPanel';
import PlansTable from '../PlansTable';
import {NETWORK_PLAN_STATE} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {
  TestApp,
  mockNetworkPlan,
  mockPanelControl,
  renderAsync,
  testHistory,
} from '@fbcnms/tg-nms/app/tests/testHelpers';

import type {AddJestTypes} from 'jest';

jest.mock('@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil');
const apiMock: $ObjMapi<
  typeof networkPlanningAPIUtilMock,
  AddJestTypes,
> = networkPlanningAPIUtilMock;

describe('Navigation to TopologyTable', () => {
  it('should not navigate to topology table if plan is not SUCCESS', async () => {
    apiMock.getPlan.mockImplementation(({id}: {id: number}) =>
      Promise.resolve(
        mockNetworkPlan({
          id,
          name: 'test plan',
          state: NETWORK_PLAN_STATE.DRAFT,
        }),
      ),
    );
    const history = testHistory('/test/test/planning/folder/1?planid=2');
    await testRender({history});
    expect(history.location.pathname).toEqual('/test/test/planning/folder/1');
    expect(history.location.search).toEqual('?planid=2');
  });
  it('should navigate to topology table if plan is SUCCESS', async () => {
    apiMock.getPlan.mockImplementation(({id}: {id: number}) =>
      Promise.resolve(
        mockNetworkPlan({
          id,
          name: 'test plan',
          state: NETWORK_PLAN_STATE.SUCCESS,
        }),
      ),
    );
    const history = testHistory('/test/test/planning/folder/1?planid=2');
    await testRender({history});
    expect(history.location.pathname).toEqual(
      '/test/test/planning/folder/1/plan',
    );
    expect(history.location.search).toEqual('?planid=2');
  });
});

function testRender({history}) {
  const panelControl = mockPanelControl({
    getIsOpen: jest.fn(() => true),
    getIsHidden: jest.fn(() => false),
  });
  return renderAsync(
    <TestApp history={history}>
      <NetworkPlanningContextProvider>
        <NetworkPlanningPanel panelControl={panelControl} />
        <PlansTable />
      </NetworkPlanningContextProvider>
    </TestApp>,
  );
}
