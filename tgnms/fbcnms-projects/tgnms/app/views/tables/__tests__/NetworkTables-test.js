/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NetworkTables, {TABLE_LIMITS} from '../NetworkTables';
import React from 'react';
import axios from 'axios';
import {
  NetworkContextWrapper,
  TestApp,
  initWindowConfig,
  testHistory,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render, within} from '@testing-library/react';

const axiosMock = jest.spyOn(axios, 'default');
axiosMock.mockImplementation(() => Promise.resolve({data: []}));
jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

beforeEach(() => {
  initWindowConfig({
    featureFlags: {
      NETWORKTEST_ENABLED: true,
      SCANSERVICE_ENABLED: true,
      NETWORK_PLANNING_ENABLED: true,
    },
  });
});

const defaultProps = {
  onResize: jest.fn(),
};

test('Shows nodes table by default', () => {
  const {getByTestId} = render(
    <TestApp route="/tables/testnetwork">
      <NetworkContextWrapper contextValue={{networkName: 'testnetwork'}}>
        <NetworkTables {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
    {baseElement: document?.body ?? undefined},
  );
  expect(getByTestId('network-nodes-table')).toBeInTheDocument();
});
test('Clicking tabs shows the correct tables in map nodes path', () => {
  const {getByTestId, getByText} = render(
    <TestApp route="/map/testnetwork/nodes">
      <NetworkContextWrapper contextValue={{networkName: 'testnetwork'}}>
        <NetworkTables {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
    {baseElement: document?.body ?? undefined},
  );
  expect(getByTestId('network-nodes-table')).toBeInTheDocument();
  const tabs = within(getByTestId('network-tables-tabs'));
  const nodesTab = tabs.getByText(/nodes/i);
  const linksTab = tabs.getByText(/links/i);
  const testsTab = tabs.getByText(/tests/i);
  const scansTab = tabs.getByText(/scans/i);
  const planningTab = tabs.getByText(/planning/i);

  act(() => {
    fireEvent.click(linksTab);
  });
  expect(getByTestId('network-links-table')).toBeInTheDocument();
  act(() => {
    fireEvent.click(testsTab);
  });
  expect(getByText(/Schedule Network Test/i)).toBeInTheDocument();

  act(() => {
    fireEvent.click(scansTab);
  });
  expect(getByText(/Schedule Scan/i)).toBeInTheDocument();
  act(() => {
    fireEvent.click(planningTab);
  });
  expect(getByTestId('network-planning-table')).toBeInTheDocument();
  act(() => {
    fireEvent.click(nodesTab);
  });
  expect(getByTestId('network-nodes-table')).toBeInTheDocument();
});
test('Clicking tabs shows the correct tables in tables path', () => {
  const {getByTestId, getByText} = render(
    <TestApp route="/tables/testnetwork">
      <NetworkContextWrapper contextValue={{networkName: 'testnetwork'}}>
        <NetworkTables {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
    {baseElement: document?.body ?? undefined},
  );
  expect(getByTestId('network-nodes-table')).toBeInTheDocument();
  const tabs = within(getByTestId('network-tables-tabs'));
  const nodesTab = tabs.getByText(/nodes/i);
  const linksTab = tabs.getByText(/links/i);
  const testsTab = tabs.getByText(/tests/i);
  const scansTab = tabs.getByText(/scans/i);
  const planningTab = tabs.queryByText(/planning/i);
  expect(planningTab).toBeNull();

  act(() => {
    fireEvent.click(linksTab);
  });
  expect(getByTestId('network-links-table')).toBeInTheDocument();
  act(() => {
    fireEvent.click(testsTab);
  });
  expect(getByText(/Schedule Network Test/i)).toBeInTheDocument();

  act(() => {
    fireEvent.click(scansTab);
  });
  expect(getByText(/Schedule Scan/i)).toBeInTheDocument();
  act(() => {
    fireEvent.click(nodesTab);
  });
  expect(getByTestId('network-nodes-table')).toBeInTheDocument();
});
test('URL routes show the correct tables', async () => {
  const history = testHistory('/tables/testnetwork');
  const {getByTestId, getByText} = render(
    <TestApp history={history}>
      <NetworkContextWrapper contextValue={{networkName: 'testnetwork'}}>
        <NetworkTables {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
    {
      baseElement: document?.body ?? undefined,
    },
  );
  expect(getByTestId('network-nodes-table')).toBeInTheDocument();
  act(() => {
    history.push('/tables/testnetwork/links');
  });
  expect(getByTestId('network-links-table')).toBeInTheDocument();
  act(() => {
    history.push('/tables/testnetwork/tests');
  });
  expect(getByText(/Schedule Network Test/i)).toBeInTheDocument();

  act(() => {
    history.push('/tables/testnetwork/scans');
  });
  expect(getByText(/Schedule Scan/i)).toBeInTheDocument();
  act(() => {
    history.push('/tables/testnetwork/planning');
  });
  expect(getByTestId('network-planning-table')).toBeInTheDocument();
});

describe('Embedded in map', () => {
  test('Clicking the expand/collapse button resizes the table', () => {
    const {getByTestId, rerender} = render(
      <TestApp route="/map/testnetwork">
        <NetworkContextWrapper contextValue={{networkName: 'testnetwork'}}>
          <NetworkTables {...defaultProps} tableHeight={200} />
        </NetworkContextWrapper>
      </TestApp>,
      {baseElement: document?.body ?? undefined},
    );
    expect(defaultProps.onResize).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(getByTestId('expand-table'));
    });
    expect(defaultProps.onResize).toHaveBeenLastCalledWith(
      TABLE_LIMITS.maxHeight,
    );
    rerender(
      <TestApp route="/map/testnetwork">
        <NetworkContextWrapper contextValue={{networkName: 'testnetwork'}}>
          <NetworkTables
            {...defaultProps}
            tableHeight={TABLE_LIMITS.maxHeight}
          />
        </NetworkContextWrapper>
      </TestApp>,
    );
    act(() => {
      fireEvent.click(getByTestId('expand-table'));
    });
    expect(defaultProps.onResize).toHaveBeenLastCalledWith(
      TABLE_LIMITS.minHeight,
    );
  });
});

describe('Export', () => {
  test('clicking export button opens export menu', () => {
    const {getByTestId} = render(
      <TestApp route="/tables/testnetwork/nodes">
        <NetworkContextWrapper>
          <NetworkTables {...defaultProps} />
        </NetworkContextWrapper>
      </TestApp>,
      {baseElement: document?.body ?? undefined},
    );
    const menuButton = getByTestId('export-menu-button');
    act(() => {
      fireEvent.click(menuButton);
    });
    expect(getByTestId('export-menu')).toBeInTheDocument();
  });
  test('clicking export csv calls csv api endpoint', async () => {
    const getMock = jest.spyOn(axios, 'get').mockResolvedValueOnce({});
    const {getByTestId, getByText} = render(
      <TestApp route="/tables/testnetwork/nodes">
        <NetworkContextWrapper contextValue={{networkName: 'testnetwork'}}>
          <NetworkTables {...defaultProps} />
        </NetworkContextWrapper>
      </TestApp>,
      {baseElement: document?.body ?? undefined},
    );
    expect(getMock).not.toHaveBeenCalled();
    const menuButton = getByTestId('export-menu-button');
    act(() => {
      fireEvent.click(menuButton);
    });
    await act(async () => {
      fireEvent.click(getByText('CSV'));
    });
    expect(getMock).toHaveBeenCalledWith('/export/testnetwork/nodes/csv', {
      cancelToken: expect.any(Object),
    });
  });
});
