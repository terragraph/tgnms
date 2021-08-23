/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as networkPlanningAPIUtilMock from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import PlanResultsView from '../PlanResultsView';
import {NETWORK_PLAN_STATE} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {OUTPUT_FILENAME} from '@fbcnms/tg-nms/shared/dto/ANP';
import {
  TestApp,
  mockANPFile,
  mockNetworkPlan,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent} from '@testing-library/react';
import type {AddJestTypes} from 'jest';
import type {NetworkPlan} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
jest.mock('@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil');

const apiMock: $ObjMapi<
  typeof networkPlanningAPIUtilMock,
  AddJestTypes,
> = networkPlanningAPIUtilMock;

const mockANPJsonPlan = {
  sites: {},
  nodes: {},
  sectors: {},
  links: {},
};
const commonProps = {
  onExit: jest.fn(),
  onCopyPlan: jest.fn(),
};
beforeEach(() => {
  apiMock.getPlan.mockImplementation(({id}: {id: number}) =>
    Promise.resolve(
      mockNetworkPlan({
        id,
        name: 'test plan',
        state: NETWORK_PLAN_STATE.SUCCESS,
      }),
    ),
  );
  apiMock.getPlanOutputFiles.mockResolvedValue([
    mockANPFile({id: '8', file_name: OUTPUT_FILENAME.REPORTING_GRAPH_JSON}),
    mockANPFile({id: '9', file_name: OUTPUT_FILENAME.SITES_OPTIMIZED_CSV}),
  ]);
  apiMock.downloadFile.mockResolvedValue(mockANPJsonPlan);
});
afterEach(() => {
  jest.resetAllMocks();
});

describe('Cancel Plan', () => {
  test('cancel plan button shows for running plans', async () => {
    const {getByText, getByTestId} = await renderAsync(
      <TestView plan={mockNetworkPlan({state: NETWORK_PLAN_STATE.RUNNING})} />,
    );
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(getByText('Cancel Plan')).toBeInTheDocument();
  });
  test('cancel plan button doesnt show for killed/failed/succeeded plans', async () => {
    const {queryByText, getByTestId, rerender} = await renderAsync(
      <TestView plan={mockNetworkPlan({state: NETWORK_PLAN_STATE.ERROR})} />,
    );
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(queryByText('Cancel Plan')).not.toBeInTheDocument();
    await act(async () => {
      rerender(
        <TestView
          plan={mockNetworkPlan({state: NETWORK_PLAN_STATE.CANCELLED})}
        />,
      );
    });
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(queryByText('Cancel Plan')).not.toBeInTheDocument();
    await act(async () => {
      rerender(
        <TestView
          plan={mockNetworkPlan({state: NETWORK_PLAN_STATE.SUCCESS})}
        />,
      );
    });
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(queryByText('Cancel Plan')).not.toBeInTheDocument();
  });

  test('clicking cancel plan button calls the cancel plan api', async () => {
    const {getByText} = await renderAsync(
      <TestView
        plan={mockNetworkPlan({id: 24, state: NETWORK_PLAN_STATE.RUNNING})}
      />,
    );
    const btn = getByText('Cancel Plan');
    expect(btn).toBeInTheDocument();
    expect(apiMock.cancelPlan).not.toHaveBeenCalled();
    expect(commonProps.onExit).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(apiMock.cancelPlan).toHaveBeenCalledWith({id: 24});
    expect(commonProps.onExit).toHaveBeenCalled();
  });
});

function TestView({plan}: {plan: NetworkPlan}) {
  return (
    <TestApp>
      <NetworkPlanningContextProvider>
        <PlanResultsView {...commonProps} plan={plan} />
      </NetworkPlanningContextProvider>
    </TestApp>
  );
}
