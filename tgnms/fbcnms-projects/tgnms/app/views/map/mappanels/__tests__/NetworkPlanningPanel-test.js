/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as networkPlanningAPIUtilMock from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import NetworkPlanningPanel from '../NetworkPlanningPanel';
import {FILE_ROLE, PLAN_STATUS} from '@fbcnms/tg-nms/shared/dto/ANP';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {
  TestApp,
  coerceClass,
  mockANPFile,
  mockANPPlan,
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

beforeEach(() => {
  apiMock.getPlan.mockImplementation(({id}: {id: string}) =>
    Promise.resolve(
      mockANPPlan({
        id,
        plan_name: 'test plan',
        plan_status: PLAN_STATUS.SUCCEEDED,
      }),
    ),
  );
  apiMock.getPlanInputFiles.mockResolvedValue([
    mockANPFile({id: '5', file_role: FILE_ROLE.BOUNDARY_FILE}),
    mockANPFile({id: '6', file_role: FILE_ROLE.URBAN_SITE_FILE}),
    mockANPFile({id: '7', file_role: FILE_ROLE.DSM_GEOTIFF}),
  ]);
});
afterEach(() => {
  jest.resetAllMocks();
});

test('loads the currently selected plan', async () => {
  const history = testHistory();
  history.replace({search: '?planid=1'});
  const {getByText, getByTestId} = await testRender({history});
  expect(apiMock.getPlan).toHaveBeenCalled();
  expect(apiMock.getPlanInputFiles).toHaveBeenCalled();
  expect(getByTestId('plan-results')).toBeInTheDocument();
  expect(getByText('test plan')).toBeInTheDocument();
});

test('if planid is empty(not null), render plan editor', async () => {
  const history = testHistory();
  history.replace({search: '?planid='});
  const {getByTestId} = await testRender({history});
  expect(getByTestId('plan-editor')).toBeInTheDocument();
});

test('if plan status is in-preparation, render the plan editor', async () => {
  const history = testHistory();
  history.replace({search: '?planid=1'});
  apiMock.getPlan.mockResolvedValueOnce(
    mockANPPlan({plan_status: PLAN_STATUS.IN_PREPARATION}),
  );
  const {getByLabelText, getByTestId} = await testRender({history});
  expect(apiMock.getPlan).toHaveBeenCalled();
  expect(getByTestId('plan-editor')).toBeInTheDocument();
  expect(coerceClass(getByLabelText('Name'), HTMLInputElement).value).toBe(
    'test plan',
  );
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
      </NetworkPlanningContextProvider>
    </TestApp>,
  );
}
