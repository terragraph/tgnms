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
import * as axiosMock from 'axios';
import * as hardwareProfilesAPIUtilMock from '@fbcnms/tg-nms/app/apiutils/HardwareProfilesAPIUtil';
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
jest.mock('@fbcnms/tg-nms/app/apiutils/HardwareProfilesAPIUtil');
// mock axios for apiutils other than TopologyAPIUtil
jest.mock('axios');
jest.spyOn(axiosMock, 'get').mockResolvedValue({data: {}});
jest.spyOn(topologyAPIUtilMock, 'getTopology').mockResolvedValue({});
jest.spyOn(topologyAPIUtilMock, 'getHealth').mockResolvedValue({});
jest.spyOn(hardwareProfilesAPIUtilMock, 'getAllProfiles').mockResolvedValue([]);

describe('Offline', () => {
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

  test('if nodejs backend is down, then comes back up - shows UI', async () => {
    const getMock = jest.spyOn(topologyAPIUtilMock, 'getTopology');
    getMock.mockRejectedValueOnce(new Error('Network Error'));
    getMock.mockResolvedValueOnce(mockNetworkConfig());
    const {getByTestId, getByText, rerender} = await renderAsync(
      <NetworkUITest />,
    );
    expect(getByTestId('loading-error')).toBeInTheDocument();
    expect(getByText(/NMS Backend offline/i)).toBeInTheDocument();
    await rerender(<NetworkUITest key="1" />);
    expect(getByTestId('network-tables-tabs')).toBeInTheDocument();
  });

  test(
    'if nodejs backend is down, renders' +
      ' "nms backend offline" error message',
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
});

describe('Hardware Profiles', () => {
  test('Fetches hardware profiles at startup', async () => {
    await renderAsync(<NetworkUITest />);
    expect(hardwareProfilesAPIUtilMock.getAllProfiles).toHaveBeenCalledTimes(1);
  });
});

function NetworkUITest() {
  return (
    <TestApp route="/tables/test">
      <NetworkListContext.Provider value={mockNetworkListContext()}>
        <Route path="/:viewName/:networkName" component={NetworkUI} />
      </NetworkListContext.Provider>
    </TestApp>
  );
}
