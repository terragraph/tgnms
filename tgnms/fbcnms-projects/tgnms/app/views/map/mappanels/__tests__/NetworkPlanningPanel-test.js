/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as networkPlanningAPIUtilMock from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import NetworkPlanningPanel from '../NetworkPlanningPanel';
import {FILE_ROLE, OUTPUT_FILENAME} from '@fbcnms/tg-nms/shared/dto/ANP';
import {NETWORK_PLAN_STATE} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {PLANNING_BASE_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {
  TestApp,
  coerceClass,
  mockANPFile,
  mockInputFile,
  mockNetworkPlan,
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

const mockBoundary = mockInputFile({
  id: 5,
  role: FILE_ROLE.BOUNDARY_FILE,
  name: 'boundary_file.kml',
});
const mockSites = mockInputFile({
  id: 6,
  role: FILE_ROLE.URBAN_SITE_FILE,
  name: 'urban_site_file.csv',
});
const mockDsm = mockInputFile({
  id: 7,
  role: FILE_ROLE.DSM_GEOTIFF,
  name: 'dsm_geotiff.tiff',
});

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
  apiMock.getPlanInputFiles.mockResolvedValue([
    mockBoundary,
    mockSites,
    mockDsm,
  ]);

  apiMock.getPartnerFiles.mockResolvedValue({data: []});
  apiMock.createPlan.mockResolvedValue(mockNetworkPlan());
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

test('loads the reporting graph json', async () => {
  const history = testHistory();
  history.replace({search: '?planid=1'});
  const panelControl = mockPanelControl({
    getIsOpen: jest.fn(() => true),
    getIsHidden: jest.fn(() => false),
  });

  // Mock output files
  apiMock.getPlanOutputFiles.mockResolvedValue([
    mockANPFile({
      id: '8',
      file_name: OUTPUT_FILENAME.REPORTING_GRAPH_JSON,
      file_role: FILE_ROLE.URBAN_TOPOLOGY_JSON,
    }),
    mockANPFile({
      id: '9',
      file_name: OUTPUT_FILENAME.SITES_OPTIMIZED_CSV,
      file_role: FILE_ROLE.URBAN_SITE_FILE,
    }),
  ]);

  // Ensure reporting graph is downloaded and set correctly.
  const mockSetPlanTopology = jest.fn();
  apiMock.downloadANPFile.mockResolvedValue({
    sites: {success: {}},
    nodes: {},
    links: {},
    sectors: {},
  });
  const {getByText} = await renderAsync(
    <TestApp history={history}>
      <NetworkPlanningContextProvider
        planTopology={{sites: {}, nodes: {}, links: {}, sectors: {}}}
        setPlanTopology={mockSetPlanTopology}>
        <NetworkPlanningPanel panelControl={panelControl} />
      </NetworkPlanningContextProvider>
    </TestApp>,
  );
  expect(apiMock.getPlanOutputFiles).toHaveBeenCalled();
  expect(getByText(OUTPUT_FILENAME.REPORTING_GRAPH_JSON)).toBeInTheDocument();
  expect(getByText(OUTPUT_FILENAME.SITES_OPTIMIZED_CSV)).toBeInTheDocument();
  expect(mockSetPlanTopology).toHaveBeenCalledWith({
    sites: {success: {}},
    nodes: {},
    links: {},
    sectors: {},
  });
});

test('if plan status is draft, render the plan editor', async () => {
  const history = testHistory();
  history.replace({search: '?planid=1'});
  apiMock.getPlan.mockResolvedValueOnce(
    mockNetworkPlan({state: NETWORK_PLAN_STATE.DRAFT}),
  );
  const {getByLabelText, getByTestId} = await testRender({history});
  expect(apiMock.getPlan).toHaveBeenCalled();
  expect(getByTestId('plan-editor')).toBeInTheDocument();
  expect(coerceClass(getByLabelText('Plan Name'), HTMLInputElement).value).toBe(
    'test plan',
  );
});

describe('Copy Plan', () => {
  test('copy plan creates a new plan and opens the plan editor', async () => {
    const FOLDER_ID = 1;
    const CREATED_PLAN_ID = 5;
    const history = testHistory(`${PLANNING_BASE_PATH}/folder/${FOLDER_ID}`);
    history.replace({search: '?planid=1'});
    const createdPlan = mockNetworkPlan({
      // when the plan gets copied, it will be renamed with a v2
      name: 'test plan V2',
      id: CREATED_PLAN_ID,
      state: NETWORK_PLAN_STATE.DRAFT,
      boundaryFile: mockBoundary,
      sitesFile: mockSites,
      dsmFile: mockDsm,
    });
    apiMock.createPlan.mockResolvedValueOnce(mockNetworkPlan(createdPlan));
    // first getPlan should return the original plan
    apiMock.getPlan.mockResolvedValueOnce(
      mockNetworkPlan({
        id: 1,
        name: 'test plan',
        state: NETWORK_PLAN_STATE.SUCCESS,
        boundaryFile: mockBoundary,
        sitesFile: mockSites,
        dsmFile: mockDsm,
      }),
    );
    // first getPlan should return the newly created plan
    apiMock.getPlan.mockResolvedValueOnce(createdPlan);
    apiMock.launchPlan.mockResolvedValueOnce({success: true});
    const {
      getByText,
      getByDisplayValue,
      getByLabelText,
      getByTestId,
    } = await testRender({
      history,
    });
    const copyBtn = getByText('Copy Plan');
    expect(copyBtn).toBeInTheDocument();
    expect(history.location.search).toBe(`?planid=${1}`);

    // first, plan-results should show with the previous plan
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(getByText('test plan')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    /**
     * start plan should create the plan, launch it,
     * then navigate view the created plan
     */
    expect(apiMock.createPlan).toHaveBeenCalledTimes(1);
    expect(apiMock.createPlan).toHaveBeenCalledWith({
      name: 'test plan V2',
      folderId: FOLDER_ID,
      boundaryFileId: 5,
      sitesFileId: 6,
      dsmFileId: 7,
    });
    expect(apiMock.getPlan).toHaveBeenCalledTimes(2);

    expect(history.location.search).toBe(`?planid=${CREATED_PLAN_ID}`);
    expect(getByTestId('plan-editor')).toBeInTheDocument();
    expect(
      coerceClass(getByLabelText('Plan Name'), HTMLInputElement).value,
    ).toBe('test plan V2');
    expect(getByDisplayValue('boundary_file.kml')).toBeInTheDocument();
    expect(getByDisplayValue('urban_site_file.csv')).toBeInTheDocument();
    expect(getByDisplayValue('dsm_geotiff.tiff')).toBeInTheDocument();
  });
});

describe('Launch Plan', () => {
  test('launching a plan loads the running plan into the results view', async () => {
    const plan = mockNetworkPlan({
      id: 1,
      folderId: 1,
      name: 'test plan',
      state: NETWORK_PLAN_STATE.DRAFT,
      boundaryFile: mockBoundary,
      sitesFile: mockSites,
      dsmFile: mockDsm,
    });
    apiMock.getPlan.mockResolvedValueOnce(plan);
    apiMock.updatePlan.mockResolvedValueOnce(plan);
    apiMock.launchPlan.mockResolvedValueOnce({success: true});
    const history = testHistory(`${PLANNING_BASE_PATH}/folder/1`);
    history.replace({search: '?planid=1'});
    const {getByText, getByLabelText, getByTestId} = await testRender({
      history,
    });
    // ensure it renders the plan editor
    expect(getByTestId('plan-editor')).toBeInTheDocument();
    expect(
      coerceClass(getByLabelText('Plan Name'), HTMLInputElement).value,
    ).toBe('test plan');
    expect(apiMock.getPlan).toHaveBeenCalledTimes(1);
    expect(apiMock.launchPlan).not.toHaveBeenCalled();
    const startPlan = getByText('Create Plan');
    await act(async () => {
      fireEvent.click(startPlan);
    });
    expect(apiMock.launchPlan).toHaveBeenCalledTimes(1);
    expect(apiMock.launchPlan).toHaveBeenCalledWith({id: 1});
    expect(apiMock.getPlan).toHaveBeenCalledTimes(2);
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(getByText('test plan')).toBeInTheDocument();
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
