/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as networkPlanningAPIUtilMock from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import PlanKPIView from '../PlanKPIView';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {
  TestApp,
  mockANPPlanMetrics,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';

import type {AddJestTypes} from 'jest';

jest.mock('@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil');
const apiMock: $ObjMapi<
  typeof networkPlanningAPIUtilMock,
  AddJestTypes,
> = networkPlanningAPIUtilMock;

test('shows an error message if metrics are not available', async () => {
  apiMock.getPlanMetrics.mockResolvedValueOnce({id: '12345'});
  const {getByText, getByTestId} = await renderAsync(<TestView planId={1} />);
  expect(getByTestId('plan-kpi-view')).toBeInTheDocument();
  expect(getByText(/No metrics found/i)).toBeInTheDocument();
});
test('shows section headers if metrics are available', async () => {
  const {metrics} = mockANPPlanMetrics();
  apiMock.getPlanMetrics.mockResolvedValueOnce(metrics);
  const {getByText, queryByText, getByTestId} = await renderAsync(
    <TestView planId={1} />,
  );
  expect(getByTestId('plan-kpi-view')).toBeInTheDocument();
  expect(queryByText(/No metrics found/i)).not.toBeInTheDocument();
  expect(getByText(/CN Sites/i)).toBeInTheDocument();
});

function TestView({planId}: {planId: number}) {
  return (
    <TestApp>
      <NetworkPlanningContextProvider>
        <PlanKPIView planId={planId} />
      </NetworkPlanningContextProvider>
    </TestApp>
  );
}
