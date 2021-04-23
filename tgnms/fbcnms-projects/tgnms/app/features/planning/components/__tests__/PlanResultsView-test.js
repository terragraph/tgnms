/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as networkPlanningAPIUtilMock from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import PlanResultsView from '../PlanResultsView';
import {
  FILE_ROLE,
  OUTPUT_FILENAME,
  PLAN_STATUS,
} from '@fbcnms/tg-nms/shared/dto/ANP';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {
  TestApp,
  mockANPFile,
  mockANPPlan,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent} from '@testing-library/react';
import type {ANPPlan} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {AddJestTypes} from 'jest';
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
  inputFiles: {
    [FILE_ROLE.BOUNDARY_FILE]: mockANPFile({
      id: '5',
      file_role: FILE_ROLE.BOUNDARY_FILE,
    }),
    [FILE_ROLE.URBAN_SITE_FILE]: mockANPFile({
      id: '6',
      file_role: FILE_ROLE.URBAN_SITE_FILE,
    }),
    [FILE_ROLE.DSM_GEOTIFF]: mockANPFile({
      id: '7',
      file_role: FILE_ROLE.DSM_GEOTIFF,
    }),
  },
  onExit: jest.fn(),
  onCopyPlan: jest.fn(),
};
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
  apiMock.getPlanOutputFiles.mockResolvedValue([
    mockANPFile({id: '8', file_name: OUTPUT_FILENAME.REPORTING_GRAPH_JSON}),
    mockANPFile({id: '9', file_name: OUTPUT_FILENAME.SITES_OPTIMIZED_CSV}),
  ]);
  // This is due to some weirdness in the ANP output apis
  apiMock.downloadFile.mockResolvedValue(
    "b'" + JSON.stringify(mockANPJsonPlan) + "'",
  );
});
afterEach(() => {
  jest.resetAllMocks();
});

describe('Cancel Plan', () => {
  test('cancel plan button shows for running plans', async () => {
    const {getByText, getByTestId} = await renderAsync(
      <TestView plan={mockANPPlan({plan_status: PLAN_STATUS.RUNNING})} />,
    );
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(getByText('Cancel Plan')).toBeInTheDocument();
  });
  test('cancel plan button doesnt show for killed/failed/succeeded plans', async () => {
    const {queryByText, getByTestId, rerender} = await renderAsync(
      <TestView plan={mockANPPlan({plan_status: PLAN_STATUS.FAILED})} />,
    );
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(queryByText('Cancel Plan')).not.toBeInTheDocument();
    await act(async () => {
      rerender(
        <TestView plan={mockANPPlan({plan_status: PLAN_STATUS.SCHEDULED})} />,
      );
    });
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(queryByText('Cancel Plan')).not.toBeInTheDocument();
    await act(async () => {
      rerender(
        <TestView plan={mockANPPlan({plan_status: PLAN_STATUS.SUCCEEDED})} />,
      );
    });
    expect(getByTestId('plan-results')).toBeInTheDocument();
    expect(queryByText('Cancel Plan')).not.toBeInTheDocument();
  });

  test('clicking cancel plan button calls the cancel plan api', async () => {
    const {getByText} = await renderAsync(
      <TestView
        plan={mockANPPlan({id: '24', plan_status: PLAN_STATUS.RUNNING})}
      />,
    );
    const btn = getByText('Cancel Plan');
    expect(btn).toBeInTheDocument();
    expect(apiMock.cancelPlan).not.toHaveBeenCalled();
    expect(commonProps.onExit).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(apiMock.cancelPlan).toHaveBeenCalledWith({id: '24'});
    expect(commonProps.onExit).toHaveBeenCalled();
  });
});

function TestView({plan}: {plan: ANPPlan}) {
  return (
    <TestApp>
      <NetworkPlanningContextProvider>
        <PlanResultsView {...commonProps} plan={plan} />
      </NetworkPlanningContextProvider>
    </TestApp>
  );
}
