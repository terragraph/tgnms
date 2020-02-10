/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import NetworkStatsPrometheus from '../NetworkStatsPrometheus';
import React from 'react';
import nullthrows from '@fbcnms/util/nullthrows';
import {act, cleanup, fireEvent} from '@testing-library/react';
import {mockNetworkConfig, renderWithRouter} from '../../../tests/testHelpers';

import axios from 'axios';
jest.mock('axios');

afterEach(() => {
  jest.resetAllMocks();
  cleanup();
});

// ensure loading icon before data loaded
describe('prometheus stats rendering', () => {
  test('basic options render', async () => {
    // mock stats type-ahead data
    jest
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({data: mockStatsTypeaheadResponse()});
    const {getByText} = renderWithRouter(
      <NetworkStatsPrometheus networkConfig={mockNetworkConfig()} />,
    );
    expect(getByText('Prometheus Query')).toBeInTheDocument();
    expect(getByText('Time Window')).toBeInTheDocument();
  });

  test('type-ahead renders options', async () => {
    // mock stats type-ahead data
    jest
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({data: mockStatsTypeaheadResponse()});
    const {getByText, queryByText} = renderWithRouter(
      <NetworkStatsPrometheus networkConfig={mockNetworkConfig()} />,
    );
    const keyDropDown = nullthrows(
      document.getElementById('key-name-drop-down'),
    );
    // mock working prometheus data
    jest
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({data: mockPrometheusResponse()});
    await act(async () => {
      fireEvent.click(keyDropDown);
    });
    fireEvent.keyDown(keyDropDown, {key: 'ArrowDown', code: 40});
    // ensure type-ahead elements exist
    expect(getByText('rssi')).toBeInTheDocument();
    expect(getByText('snr')).toBeInTheDocument();
    // select the first item (rssi)
    fireEvent.keyDown(keyDropDown, {key: 'Enter', code: 13});
    // other items in drop-down should no longer be rendered
    expect(queryByText('snr')).not.toBeInTheDocument();
  });
  // TODO - graphs render
});

function mockStatsTypeaheadResponse() {
  return [
    {
      id: 1,
      key_name: 'phystatus.srssi',
      key_prefix: 'tgf',
      name: 'rssi',
      description: 'Received Signal Strength Indicator',
    },
    {
      id: 2,
      key_name: 'snr',
      key_prefix: 'tgf',
      name: 'snr',
      description: 'RSSI measured on data packets',
    },
  ];
}

function mockPrometheusResponse() {
  return {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {
            __name__: 'rssi',
            instance: 'bqs:8086',
            intervalSec: '30',
            job: 'bqs_30s',
            linkDirection: 'A',
            linkName: 'link_terra111_f1_terra212_f1',
            network: 'topology test',
            nodeMac: '38:3a:21:b0:17:1f',
            nodeName: 'terra111.f1',
            siteName: '11',
          },
          values: [
            [1572284189, '-6'],
            [1572284219, '-6'],
            [1572284249, '-6'],
            [1572284279, '-6'],
            [1572284309, '-6'],
          ],
        },
        {
          metric: {
            __name__: 'rssi',
            instance: 'bqs:8086',
            intervalSec: '30',
            job: 'bqs_30s',
            linkDirection: 'A',
            linkName: 'link_terra114_f1_terra123_f1',
            network: 'topology test',
            nodeMac: '38:3a:21:b0:11:67',
            nodeName: 'terra114.f1',
            siteName: '11',
          },
          values: [
            [1572284189, '-4'],
            [1572284219, '-4'],
            [1572284249, '-4'],
            [1572284279, '-4'],
            [1572284309, '-4'],
          ],
        },
        {
          metric: {
            __name__: 'rssi',
            instance: 'bqs:8086',
            intervalSec: '30',
            job: 'bqs_30s',
            linkDirection: 'A',
            linkName: 'link_terra121_f1_terra222_f1',
            network: 'topology test',
            nodeMac: '38:3a:21:b0:14:df',
            nodeName: 'terra121.f1',
            siteName: '12',
          },
          values: [
            [1572284189, '-5'],
            [1572284219, '-5'],
            [1572284249, '-5'],
            [1572284279, '-5'],
            [1572284309, '-5'],
          ],
        },
        {
          metric: {
            __name__: 'rssi',
            instance: 'bqs:8086',
            intervalSec: '30',
            job: 'bqs_30s',
            linkDirection: 'A',
            linkName: 'link_terra214_f1_terra223_f1',
            network: 'topology test',
            nodeMac: '38:3a:21:b0:18:65',
            nodeName: 'terra214.f1',
            siteName: '21',
          },
          values: [
            [1572284189, '-3'],
            [1572284219, '-3'],
            [1572284249, '-3'],
            [1572284279, '-3'],
            [1572284309, '-3'],
          ],
        },
        {
          metric: {
            __name__: 'rssi',
            instance: 'bqs:8086',
            intervalSec: '30',
            job: 'bqs_30s',
            linkDirection: 'Z',
            linkName: 'link_terra111_f1_terra212_f1',
            network: 'topology test',
            nodeMac: '38:3a:21:b0:17:87',
            nodeName: 'terra212.f1',
            siteName: '21',
          },
          values: [
            [1572284189, '-5'],
            [1572284219, '-5'],
            [1572284249, '-4'],
            [1572284279, '-4'],
            [1572284309, '-4'],
          ],
        },
        {
          metric: {
            __name__: 'rssi',
            instance: 'bqs:8086',
            intervalSec: '30',
            job: 'bqs_30s',
            linkDirection: 'Z',
            linkName: 'link_terra114_f1_terra123_f1',
            network: 'topology test',
            nodeMac: '38:3a:21:b0:19:35',
            nodeName: 'terra123.f1',
            siteName: '12',
          },
          values: [
            [1572284189, '-3'],
            [1572284219, '-4'],
            [1572284249, '-3'],
            [1572284279, '-3'],
            [1572284309, '-3'],
          ],
        },
        {
          metric: {
            __name__: 'rssi',
            instance: 'bqs:8086',
            intervalSec: '30',
            job: 'bqs_30s',
            linkDirection: 'Z',
            linkName: 'link_terra121_f1_terra222_f1',
            network: 'topology test',
            nodeMac: '38:3a:21:b0:11:89',
            nodeName: 'terra222.f1',
            siteName: '22',
          },
          values: [
            [1572284189, '-5'],
            [1572284219, '-5'],
            [1572284249, '-5'],
            [1572284279, '-5'],
            [1572284309, '-5'],
          ],
        },
        {
          metric: {
            __name__: 'rssi',
            instance: 'bqs:8086',
            intervalSec: '30',
            job: 'bqs_30s',
            linkDirection: 'Z',
            linkName: 'link_terra214_f1_terra223_f1',
            network: 'topology test',
            nodeMac: '38:3a:21:b0:11:91',
            nodeName: 'terra223.f1',
            siteName: '22',
          },
          values: [
            [1572284189, '-4'],
            [1572284219, '-4'],
            [1572284249, '-4'],
            [1572284279, '-4'],
            [1572284309, '-5'],
          ],
        },
      ],
    },
  };
}
