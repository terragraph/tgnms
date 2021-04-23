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
import {PLANNING_BASE_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {
  TestApp,
  coerceClass,
  mockANPFile,
  mockANPPlan,
  mockPanelControl,
  renderAsync,
  testHistory,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent} from '@testing-library/react';
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
    mockANPFile({
      id: '5',
      file_role: FILE_ROLE.BOUNDARY_FILE,
      file_name: 'boundary_file',
    }),
    mockANPFile({
      id: '6',
      file_role: FILE_ROLE.URBAN_SITE_FILE,
      file_name: 'urban_site_file',
    }),
    mockANPFile({
      id: '7',
      file_role: FILE_ROLE.DSM_GEOTIFF,
      file_name: 'dsm_geotiff',
    }),
  ]);

  apiMock.getPartnerFiles.mockResolvedValue({data: []});
  apiMock.createPlan.mockResolvedValue(mockANPPlan());
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

describe('Copy Plan', () => {
  test('copy plan opens the plan editor with inputs from the current plan', async () => {
    const history = testHistory(PLANNING_BASE_PATH + '/folder/1');
    history.replace({search: '?planid=1'});
    const {getByText, getByTestId, getByLabelText} = await testRender({
      history,
    });
    const copyBtn = getByText('Copy Plan');
    expect(copyBtn).toBeInTheDocument();
    // first, plan-results should show with the previous plan
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(getByText('test plan')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(getByTestId('plan-editor')).toBeInTheDocument();
    // copying a plan should suggest a new name
    expect(coerceClass(getByLabelText('Name'), HTMLInputElement).value).toBe(
      'test plan V2',
    );
    expect(getByText('boundary_file.txt')).toBeInTheDocument();
    expect(getByText('urban_site_file.txt')).toBeInTheDocument();
    expect(getByText('dsm_geotiff.txt')).toBeInTheDocument();
    expect(history.location.search).toBe('?planid=');
  });

  test('submitting copied plan creates new plan', async () => {
    const FOLDER_ID = '1';
    const CREATED_PLAN_ID = '5';
    const history = testHistory(`${PLANNING_BASE_PATH}/folder/${FOLDER_ID}`);
    history.replace({search: '?planid=1'});
    const createdPlan = mockANPPlan({
      // when the plan gets copied, it will be renamed with a v2
      plan_name: 'test plan V2',
      id: CREATED_PLAN_ID,
    });
    apiMock.createPlan.mockResolvedValueOnce(mockANPPlan(createdPlan));
    // first getPlan should return the original plan
    apiMock.getPlan.mockResolvedValueOnce(
      mockANPPlan({
        plan_name: 'test plan',
        plan_status: PLAN_STATUS.SUCCEEDED,
      }),
    );
    // first getPlan should return the newly created plan
    apiMock.getPlan.mockResolvedValueOnce(createdPlan);
    apiMock.launchPlan.mockResolvedValueOnce({success: true});
    const {getByText, getByTestId} = await testRender({
      history,
    });
    const copyBtn = getByText('Copy Plan');
    expect(copyBtn).toBeInTheDocument();
    // first, plan-results should show with the previous plan
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(getByText('test plan')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    await act(async () => {
      fireEvent.click(getByText(/Start Plan/i));
    });
    /**
     * start plan should create the plan, launch it,
     * then navigate view the created plan
     */
    expect(apiMock.createPlan).toHaveBeenCalledWith({
      boundary_polygon: '5',
      dsm: '7',
      folder_id: FOLDER_ID,
      plan_name: 'test plan V2',
      site_list: '6',
    });
    expect(apiMock.launchPlan).toHaveBeenCalledWith({
      id: CREATED_PLAN_ID,
    });
    expect(history.location.search).toBe(`?planid=${CREATED_PLAN_ID}`);
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(getByText('test plan V2')).toBeInTheDocument();
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
      </NetworkPlanningContextProvider>
    </TestApp>,
  );
}
