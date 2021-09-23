/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as TopologyTemplateHelpersMock from '@fbcnms/tg-nms/app/helpers/TopologyTemplateHelpers';
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

jest.mock('@fbcnms/tg-nms/app/helpers/TopologyTemplateHelpers', () => ({
  ...jest.requireActual('@fbcnms/tg-nms/app/helpers/TopologyTemplateHelpers'),
  uploadTopologyBuilderRequest: jest.fn(),
}));

const apiMock: $ObjMapi<
  typeof networkPlanningAPIUtilMock,
  AddJestTypes,
> = networkPlanningAPIUtilMock;

const mockANPJsonPlan = {
  sites: {
    site1: {
      site_id: 'site1',
      loc: {
        latitude: 38.549853,
        longitude: -121.779472,
        altitude: 26.367722,
      },
      polarity: 4,
      site_type: 2,
      site_capex: 1500.0,
      site_opex: 0.0,
      site_lifetime: 10,
      status_type: 3,
      site_hash: '9mb7ibebgp',
      breakdowns: 0,
      active_sectors: 0,
      times_on_mcs_route: 0,
      name: 'site1',
      active_links: 0,
      location_type: 1,
      building_id: -1,
      optimizer_status: {
        pre_optimizer: 2,
        steiner_tree: 2,
        min_cost_optimizer: 2,
        adversarial: false,
        max_coverage_optimizer: 2,
        max_deployment_optimizer: 2,
        closing_loops: 2,
      },
    },
  },
  nodes: {},
  sectors: {},
  links: {},
};

jest.mock(
  '@fbcnms/tg-nms/app/features/planning/useNetworkPlanningManager',
  () => ({
    useNetworkPlanningManager: () => ({
      filteredTopology: mockANPJsonPlan,
      getPendingTopology: () => ({
        sites: [
          {
            name: 'site1',
            location: {
              altitude: 26.367722,
              longitude: -121.779472,
              latitude: 38.549853,
            },
          },
        ],
        links: [],
        nodes: [],
      }),
    }),
  }),
);

const commonProps = {
  onExit: jest.fn(),
  onCopyPlan: jest.fn(),
};
const networkStates = Object.keys(NETWORK_PLAN_STATE);

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
  apiMock.downloadANPFile.mockResolvedValue(mockANPJsonPlan);
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

  test.each(networkStates.filter(s => s != NETWORK_PLAN_STATE.RUNNING))(
    'cancel plan button doesnt show for %s plans',
    async state => {
      const {queryByText, getByTestId} = await renderAsync(
        <TestView plan={mockNetworkPlan({state: state})} />,
      );
      expect(getByTestId('plan-results')).toBeInTheDocument();
      expect(queryByText('Cancel Plan')).not.toBeInTheDocument();
    },
  );

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

describe('Commit Plan to Network', () => {
  test('commmit plan button shows for succeeded plans', async () => {
    const {getByText, getByTestId} = await renderAsync(
      <TestView plan={mockNetworkPlan({state: NETWORK_PLAN_STATE.SUCCESS})} />,
    );
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(getByText('Commit Plan to Network')).toBeInTheDocument();
  });

  test.each(networkStates.filter(s => s != NETWORK_PLAN_STATE.SUCCESS))(
    'commit plan button doesnt show for %s plans',
    async state => {
      const {queryByText, getByTestId} = await renderAsync(
        <TestView plan={mockNetworkPlan({state: state})} />,
      );
      expect(getByTestId('plan-results')).toBeInTheDocument();
      expect(queryByText('Commit Plan to Network')).not.toBeInTheDocument();
    },
  );

  test('clicking commit plan button calls the commit plan api', async () => {
    const {getByText, getByTestId} = await renderAsync(
      <TestView
        plan={mockNetworkPlan({id: 24, state: NETWORK_PLAN_STATE.SUCCESS})}
      />,
    );
    const btn = getByText('Commit Plan to Network');
    expect(btn).toBeInTheDocument();
    expect(
      TopologyTemplateHelpersMock.uploadTopologyBuilderRequest,
    ).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(btn);
    });
    act(() => {
      fireEvent.click(getByTestId('confirm-add-topology-elements'));
    });
    expect(
      TopologyTemplateHelpersMock.uploadTopologyBuilderRequest,
    ).toHaveBeenCalledWith(
      {
        nodes: [],
        links: [],
        sites: [
          {
            name: 'site1',
            location: {
              latitude: 38.549853,
              longitude: -121.779472,
              altitude: 26.367722,
            },
          },
        ],
      },
      '',
      expect.anything(),
    );
  });
});

test('Shows plan kpi view if plan is complete', async () => {
  const {getByTestId} = await renderAsync(
    <TestView plan={mockNetworkPlan({state: NETWORK_PLAN_STATE.SUCCESS})} />,
  );
  expect(getByTestId('plan-kpi-view')).toBeInTheDocument();
});
test('Doesnt show plan kpi view if plan is not complete', async () => {
  const {queryByTestId} = await renderAsync(
    <TestView plan={mockNetworkPlan({state: NETWORK_PLAN_STATE.RUNNING})} />,
  );
  expect(queryByTestId('plan-kpi-view')).not.toBeInTheDocument();
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
