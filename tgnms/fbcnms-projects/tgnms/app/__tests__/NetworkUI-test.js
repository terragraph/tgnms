/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as axiosMock from 'axios';
import * as topologyAPIUtilMock from '@fbcnms/tg-nms/app/apiutils/TopologyAPIUtil';
import NetworkListContext from '@fbcnms/tg-nms/app/contexts/NetworkListContext';
import NetworkUI from '../NetworkUI';
import {HAPeerType} from '@fbcnms/tg-nms/shared/dto/NetworkState';
import {Route} from 'react-router-dom';
import {
  TestApp,
  mockNetworkConfig,
  mockNetworkListContext,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

jest.mock('@fbcnms/tg-nms/app/apiutils/TopologyAPIUtil');
// mock axios for apiutils other than TopologyAPIUtil
jest.mock('axios');
jest.spyOn(axiosMock, 'get').mockResolvedValue({data: {}});
jest.spyOn(topologyAPIUtilMock, 'getHealth').mockResolvedValue({});

test('renders loading spinner when no topology exists', () => {
  const _getMock = jest
    .spyOn(topologyAPIUtilMock, 'getTopology')
    .mockResolvedValueOnce({});
  const {getByTestId} = render(<NetworkUITest />);
  expect(getByTestId('loading-network')).toBeInTheDocument();
});
test('renders tables page when topology exists', async () => {
  const _getMock = jest
    .spyOn(topologyAPIUtilMock, 'getTopology')
    .mockResolvedValueOnce(mockNetworkConfig());
  const {getByTestId} = await renderAsync(<NetworkUITest />);
  expect(getByTestId('network-tables-tabs')).toBeInTheDocument();
});

test(
  'if nodejs backend is down, renders' + ' "nms backend offline" error message',
  async () => {
    const getMock = jest
      .spyOn(topologyAPIUtilMock, 'getTopology')
      .mockRejectedValueOnce(new Error('Network Error'));

    const {getByTestId, getByText} = await renderAsync(<NetworkUITest />);
    expect(getMock).toHaveBeenCalledWith('test');
    expect(getByTestId('loading-error')).toBeInTheDocument();
    expect(getByText(/NMS Backend offline/i)).toBeInTheDocument();
  },
);

test(
  'if controller is down,' + ' renders "controller offline" error message',
  async () => {
    const getMock = jest
      .spyOn(topologyAPIUtilMock, 'getTopology')
      .mockResolvedValueOnce({
        active: {
          active: HAPeerType.ERROR,
        },
      });

    const {getByTestId, getByText} = await renderAsync(<NetworkUITest />);
    expect(getMock).toHaveBeenCalledWith('test');
    expect(getByTestId('loading-error')).toBeInTheDocument();
    expect(
      getByText(/The Controller for this network is offline/i),
    ).toBeInTheDocument();
  },
);

function NetworkUITest() {
  return (
    <TestApp route="/tables/test">
      <NetworkListContext.Provider value={mockNetworkListContext()}>
        <Route path="/:viewName/:networkName" component={NetworkUI} />
      </NetworkListContext.Provider>
    </TestApp>
  );
}
