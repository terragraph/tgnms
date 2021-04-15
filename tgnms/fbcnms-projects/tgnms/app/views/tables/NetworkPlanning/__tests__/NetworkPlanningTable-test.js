/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import * as apiUtilMock from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import MaterialTheme from '@fbcnms/tg-nms/app/MaterialTheme';
import NetworkPlanningTable from '../NetworkPlanningTable';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {PLANNING_BASE_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {Route} from 'react-router-dom';
import {
  TestApp,
  renderAsync,
  renderWithRouter,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, waitForElement} from '@testing-library/react';
import type {ANPFolder, ANPPlan} from '@fbcnms/tg-nms/shared/dto/ANP';
jest.mock('@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil');

const folders: Array<ANPFolder> = [
  {
    id: '1',
    folder_name: 'folder 1',
    folder_description: '',
  },
  {
    id: '2',
    folder_name: 'folder 2',
    folder_description: '',
  },
];
const folder1Plans: Array<ANPPlan> = [
  {
    id: '1',
    plan_name: 'plan 1',
    plan_status: 'SUCCEEDED',
  },
  {
    id: '2',
    plan_name: 'plan 2',
    plan_status: 'SUCCEEDED',
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

test('if user clicks back button, goes back to folders table', async () => {
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

/**
 * using renderWithrouter here to get access to the history
 */
test('if user selects a plan, sets the planid querystring', async () => {
  jest.spyOn(apiUtilMock, 'getPlansInFolder').mockResolvedValue(folder1Plans);
  const folder1Path = PLANNING_BASE_PATH + '/folder/1';
  const {getByText, history} = renderWithRouter(
    <MaterialTheme>
      <NetworkPlanningContextProvider>
        <Route path={PLANNING_BASE_PATH} component={NetworkPlanningTable} />
      </NetworkPlanningContextProvider>
    </MaterialTheme>,
    {route: folder1Path},
  );
  expect(history.location.pathname).toBe(folder1Path);
  expect(history.location.search).toBe('');
  const plan1 = await waitForElement(() => getByText(/plan 1/i));
  expect(plan1).toBeInTheDocument();
  act(() => {
    fireEvent.click(plan1);
  });
  expect(history.location.pathname).toBe(folder1Path);
  expect(history.location.search).toBe('?planid=1');
});
