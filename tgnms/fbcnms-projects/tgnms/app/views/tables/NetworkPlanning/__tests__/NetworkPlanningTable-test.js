/**
 * Copyright 2004-present  Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import * as apiUtilMock from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import NetworkPlanningTable from '../NetworkPlanningTable';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {PLANNING_BASE_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {Route} from 'react-router-dom';
import {
  TestApp,
  renderAsync,
  testHistory,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, waitForElement, within} from '@testing-library/react';
import type {
  NetworkPlan,
  PlanFolder,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
jest.mock('@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil');

const folders: Array<PlanFolder> = [
  {
    id: 1,
    name: 'folder 1',
  },
  {
    id: 2,
    name: 'folder 2',
  },
];
const folder1Plans: Array<NetworkPlan> = [
  {
    id: 1,
    folderId: 1,
    name: 'plan 1',
    state: 'SUCCESS',
  },
  {
    id: 2,
    folderId: 1,
    name: 'plan 2',
    state: 'SUCCESS',
  },
];

test('renders the folders table by default', async () => {
  jest.spyOn(apiUtilMock, 'getFolders').mockResolvedValue(folders);
  const {getByText} = await renderAsync(
    <TestApp route={PLANNING_BASE_PATH}>
      <Route path={PLANNING_BASE_PATH} component={NetworkPlanningTable} />
    </TestApp>,
  );
  expect(getByText(/Folders/i)).toBeInTheDocument();
  expect(getByText(/folder 1/i)).toBeInTheDocument();
  expect(getByText(/folder 2/i)).toBeInTheDocument();
});

test('if user selects a folder, navigates to the plans table', async () => {
  jest.spyOn(apiUtilMock, 'getFolder').mockResolvedValue(folders[0]);
  jest.spyOn(apiUtilMock, 'getFolders').mockResolvedValue(folders);
  jest.spyOn(apiUtilMock, 'getPlansInFolder').mockResolvedValue(folder1Plans);
  const {getByText, queryByText} = await renderAsync(
    <TestApp route={PLANNING_BASE_PATH}>
      <Route path={PLANNING_BASE_PATH} component={NetworkPlanningTable} />
    </TestApp>,
  );
  await act(async () => {
    fireEvent.click(getByText(/folder 1/i));
  });
  expect(getByText(/Folder: folder 1/i)).toBeInTheDocument();
  expect(getByText(/plan 1/i)).toBeInTheDocument();
  expect(getByText(/plan 2/i)).toBeInTheDocument();
  expect(queryByText(/folder 2/i)).not.toBeInTheDocument();
});

test('if user selects a plan, navigates to the topology table', async () => {
  jest.spyOn(apiUtilMock, 'getFolder').mockResolvedValue(folders[0]);
  jest.spyOn(apiUtilMock, 'getFolders').mockResolvedValue(folders);
  jest.spyOn(apiUtilMock, 'getPlansInFolder').mockResolvedValue(folder1Plans);
  const {getByText} = await renderAsync(
    <TestApp route={PLANNING_BASE_PATH}>
      <NetworkPlanningContextProvider
        plan={{
          id: 1,
          folderId: 1,
          name: 'plan 1',
          state: 'SUCCESS',
        }}>
        <Route path={PLANNING_BASE_PATH} component={NetworkPlanningTable} />
      </NetworkPlanningContextProvider>
    </TestApp>,
  );
  await act(async () => {
    fireEvent.click(getByText(/folder 1/i));
  });
  await act(async () => {
    fireEvent.click(getByText(/plan 1/i));
  });
  expect(getByText(/Plan: plan 1/i)).toBeInTheDocument();
});

test('if user clicks back button on the plans table, goes back to folders table', async () => {
  jest.spyOn(apiUtilMock, 'getFolder').mockResolvedValue(folders[0]);
  jest.spyOn(apiUtilMock, 'getFolders').mockResolvedValue(folders);
  jest.spyOn(apiUtilMock, 'getPlansInFolder').mockResolvedValue(folder1Plans);
  const {getByText, getByTestId, queryByText} = await renderAsync(
    <TestApp route={PLANNING_BASE_PATH}>
      <Route path={PLANNING_BASE_PATH} component={NetworkPlanningTable} />
    </TestApp>,
  );
  await act(async () => {
    fireEvent.click(getByText(/folder 1/i));
  });
  expect(getByText(/Folder: folder 1/i)).toBeInTheDocument();
  expect(getByText(/plan 1/i)).toBeInTheDocument();
  expect(getByText(/plan 2/i)).toBeInTheDocument();
  expect(queryByText(/folder 2/i)).not.toBeInTheDocument();
  await act(async () => {
    fireEvent.click(getByTestId('back-to-folders'));
  });
  expect(queryByText(/Folder: folder 1/i)).not.toBeInTheDocument();
  expect(queryByText(/plan 1/i)).not.toBeInTheDocument();
  expect(queryByText(/plan 2/i)).not.toBeInTheDocument();
  expect(getByText(/folder 2/i)).toBeInTheDocument();
});

test('if user clicks back button on the topology table, goes back to plans table', async () => {
  jest.spyOn(apiUtilMock, 'getFolder').mockResolvedValue(folders[0]);
  jest.spyOn(apiUtilMock, 'getFolders').mockResolvedValue(folders);
  jest.spyOn(apiUtilMock, 'getPlansInFolder').mockResolvedValue(folder1Plans);
  const {getByText, getByTestId, queryByText} = await renderAsync(
    <TestApp route={PLANNING_BASE_PATH}>
      <Route path={PLANNING_BASE_PATH} component={NetworkPlanningTable} />
    </TestApp>,
  );
  await act(async () => {
    fireEvent.click(getByText(/folder 1/i));
  });
  await act(async () => {
    fireEvent.click(getByText(/plan 1/i));
  });
  expect(getByText('Plan:')).toBeInTheDocument();
  expect(queryByText(/Folder: folder 1/i)).not.toBeInTheDocument();
  // Go Back
  await act(async () => {
    fireEvent.click(getByTestId('back-to-plans'));
  });
  expect(queryByText(/Folder: folder 1/i)).toBeInTheDocument();
  expect(queryByText(/plan 1/i)).toBeInTheDocument();
  expect(queryByText(/plan 2/i)).toBeInTheDocument();
  expect(queryByText('Plan:')).not.toBeInTheDocument();
});

/**
 * using renderWithrouter here to get access to the history
 */
test('if user selects a plan, sets the planid querystring', async () => {
  jest.spyOn(apiUtilMock, 'getPlansInFolder').mockResolvedValue(folder1Plans);
  const folder1Path = PLANNING_BASE_PATH + '/folder/1';
  const history = testHistory(folder1Path);
  const {getByText} = await renderAsync(
    <TestApp history={history}>
      <NetworkPlanningContextProvider>
        <Route path={PLANNING_BASE_PATH} component={NetworkPlanningTable} />
      </NetworkPlanningContextProvider>
    </TestApp>,
  );
  expect(history.location.pathname).toBe(folder1Path);
  expect(history.location.search).toBe('');
  const plan1 = await waitForElement(() => getByText(/plan 1/i));
  expect(plan1).toBeInTheDocument();
  act(() => {
    fireEvent.click(plan1);
  });
  expect(history.location.pathname).toBe(folder1Path + '/plan');
  expect(history.location.search).toBe('?planid=1');
});

describe('CTAs', () => {
  test('folders table shows folder/plan menu CTA', async () => {
    jest.spyOn(apiUtilMock, 'getFolders').mockResolvedValue(folders);
    const {getByTestId} = await renderAsync(
      <TestApp route={PLANNING_BASE_PATH}>
        <Route path={PLANNING_BASE_PATH} component={NetworkPlanningTable} />
      </TestApp>,
    );

    const ctaBtn = getByTestId('folders-table-cta-button');
    act(() => {
      fireEvent.click(ctaBtn);
    });
    const cta = getByTestId('folders-table-cta');
    expect(cta).toBeInTheDocument();
    expect(within(cta).getByText(/folder/i)).toBeInTheDocument();
    expect(within(cta).getByText(/plan/i)).toBeInTheDocument();
  });
  test('plans table shows add plan CTA', async () => {
    jest.spyOn(apiUtilMock, 'getPlansInFolder').mockResolvedValue(folder1Plans);
    const folder1Path = PLANNING_BASE_PATH + '/folder/1';
    const history = testHistory(folder1Path);
    const {getByTestId} = await renderAsync(
      <TestApp history={history}>
        <NetworkPlanningContextProvider>
          <Route path={PLANNING_BASE_PATH} component={NetworkPlanningTable} />
        </NetworkPlanningContextProvider>
      </TestApp>,
      {route: folder1Path},
    );
    const btn = getByTestId('add-plan-button');
    expect(btn).toBeInTheDocument();

    // ensure that clicking the add plan button navigates to plan editor
    act(() => {
      fireEvent.click(btn);
    });
    expect(getByTestId('create-plan-modal')).toBeInTheDocument();
  });
});
