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
import SitesFileTable from '../SitesFileTable';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {
  TestApp,
  getMTableRow,
  mockInputFile,
  mockNetworkPlan,
  mockSitesFile,
  renderAsync,
  testHistory,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {within} from '@testing-library/react';
import type {AddJestTypes} from 'jest';

jest.mock('@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil');
const apiMock: $ObjMapi<
  typeof networkPlanningAPIUtilMock,
  AddJestTypes,
> = networkPlanningAPIUtilMock;

const sitesFile = mockSitesFile();
apiMock.getSitesFile.mockResolvedValue(sitesFile);

describe('SitesFileTable', () => {
  test('renders the sites as table rows', async () => {
    const {getByTestId} = await testRender();
    const table = getByTestId('sites-file-table');
    expect(within(getMTableRow(0, table)).getByText('POP')).toBeInTheDocument();
    expect(within(getMTableRow(1, table)).getByText('CN')).toBeInTheDocument();
    expect(within(getMTableRow(2, table)).getByText('DN')).toBeInTheDocument();
  });
});

function testRender() {
  const history = testHistory('/test/test/planning/folder/1/sites?planid=2');
  return renderAsync(
    <TestApp history={history}>
      <NetworkPlanningContextProvider
        plan={mockNetworkPlan({sitesFile: mockInputFile()})}>
        <SitesFileTable />
      </NetworkPlanningContextProvider>
    </TestApp>,
  );
}
