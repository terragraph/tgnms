/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import React from 'react';
import ScheduleNetworkTest, {
  ScheduleNetworkTestModal,
} from '../ScheduleNetworkTest';
import {TestApp, renderAsync} from '../../../tests/testHelpers';
import {act, cleanup, fireEvent, render, wait} from '@testing-library/react';

import axios from 'axios';
jest.mock('axios');

afterEach(() => {
  jest.resetAllMocks();
  cleanup();
});

const defaultProps = {
  loadTestExecutions: jest.fn(),
  showNotification: jest.fn(),
  onTestScheduled: jest.fn(),
  onTestScheduleFailed: jest.fn(),
  className: '',
  networkName: 'test',
  stopTestTimerOnUnmount: false,
};

describe('ScheduleNetworkTest', () => {
  test('renders without crashing', async () => {
    jest
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({data: invalidMockHelpApiResponse()});
    const {getByText} = await renderAsync(
      <TestApp>
        <ScheduleNetworkTest {...defaultProps} />
      </TestApp>,
    );
    expect(getByText(/test type/i)).toBeInTheDocument();
  });

  test('if the form is submitted, an api request is sent to the backend', async () => {
    // load test options
    jest
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({data: invalidMockHelpApiResponse()});
    // schedule test
    const axiosPostMock = jest
      .spyOn(axios, 'post')
      .mockResolvedValueOnce({data: {msg: 'scheduled test'}});
    const {getByTestId} = await renderAsync(
      <TestApp>
        <ScheduleNetworkTest {...defaultProps} />
      </TestApp>,
    );
    await act(async () => {
      fireEvent.submit(getByTestId('schedule-networktest-form'));
    });
    expect(axiosPostMock).toHaveBeenCalledWith('/network_test/start', {
      test_code: 8.3,
      topology_id: '1',
      session_duration: '300',
      test_push_rate: '200000000',
      protocol: 'UDP',
    });
  });

  test('if loading the test fails, a notification is shown', async () => {
    jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error());
    await renderAsync(
      <TestApp>
        <ScheduleNetworkTest {...defaultProps} />
      </TestApp>,
    );
    expect(defaultProps.showNotification).toHaveBeenCalled();
  });
});

describe('ScheduleNetworkTestModal', () => {
  test('opens when the button is clicked', async () => {
    // load test options
    jest
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({data: invalidMockHelpApiResponse()});
    const {getByText, queryByText} = render(
      <TestApp>
        <ScheduleNetworkTestModal {...defaultProps} />
      </TestApp>,
    );
    // expect the button to be in the dom
    const openModalButton = getByText(/schedule network test/i);
    expect(openModalButton).toBeInTheDocument();
    // expect the modal not to be open
    expect(queryByText(/test type/i)).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(openModalButton);
    });
    // after clicking the button the modal should be open
    expect(getByText(/test type/i)).toBeInTheDocument();
  });

  test('closes when cancel is clicked', async () => {
    // load test options
    jest
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({data: invalidMockHelpApiResponse()});
    const {getByText, queryByText} = await renderAsync(
      <TestApp>
        <ScheduleNetworkTestModal {...defaultProps} />
      </TestApp>,
    );
    // click open button
    await act(async () => {
      fireEvent.click(getByText(/schedule network test/i));
    });
    // modal should be open
    expect(getByText(/test type/i)).toBeInTheDocument();
    // click close button
    act(() => {
      fireEvent.click(getByText(/cancel/i));
    });
    // modal should close
    await wait(() => {
      expect(queryByText(/test type/i)).not.toBeInTheDocument();
    });
    expect(getByText(/schedule network test/i)).toBeInTheDocument();
  });

  test('clicking the schedule test button (inside the modal) submits the test', async () => {
    // load test options
    jest
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({data: invalidMockHelpApiResponse()});
    // schedule test
    const axiosPostMock = jest
      .spyOn(axios, 'post')
      .mockResolvedValueOnce({data: {msg: 'scheduled test'}});
    const {getByText} = render(
      <TestApp>
        <ScheduleNetworkTestModal {...defaultProps} />
      </TestApp>,
    );
    // open the modal
    await act(async () => {
      fireEvent.click(getByText(/schedule network test/i));
    });
    // click the submit button
    await act(async () => {
      fireEvent.click(getByText(/schedule test/i));
    });
    expect(axiosPostMock).toHaveBeenCalledWith('/network_test/start', {
      test_code: 8.3,
      topology_id: '1',
      session_duration: '300',
      test_push_rate: '200000000',
      protocol: 'UDP',
    });
  });
});

/*
 * The network test help api is broken, it does not return the
 * asap help parameter. This simulates that to test that the app doesn't crash.
 */
function invalidMockHelpApiResponse() {
  return {
    start_test: [
      {
        label: 'Parallel Link Test',
        test_code: 8.3,
        url_ext: '/api/start_test/',
        parameters: [
          {
            key: 'topology_id',
            value: '1',
            label: 'Topology ID',
            meta: {
              dropdown: [
                {label: 'mpk_production', value: '1'},
                {label: 'Casaba', value: '2'},
              ],
              ui_type: 'dropdown',
              unit: '',
              type: 'int',
            },
          },
          {
            key: 'session_duration',
            value: '300',
            label: 'Single iPerf Session Duration',
            meta: {
              range: {min_value: 10},
              ui_type: 'range',
              unit: 'seconds',
              type: 'int',
            },
          },
          {
            key: 'test_push_rate',
            value: '200000000',
            label: 'Test Push Rate',
            meta: {
              range: {min_value: 5000000, max_value: 2000000000},
              ui_type: 'range',
              unit: 'bits/sec',
              type: 'int',
            },
          },
          {
            key: 'protocol',
            value: 'UDP',
            label: 'iPerf Traffic Protocol',
            meta: {
              dropdown: [
                {label: 'UDP', value: 'UDP'},
                {label: 'TCP', value: 'TCP'},
              ],
              ui_type: 'dropdown',
              unit: '',
              type: 'str',
            },
          },
        ],
      },
      {
        label: 'Sequential Link Test',
        test_code: 8.2,
        url_ext: '/api/start_test/',
        parameters: [
          {
            key: 'topology_id',
            value: '1',
            label: 'Topology ID',
            meta: {
              dropdown: [
                {label: 'mpk_production', value: '1'},
                {label: 'Casaba', value: '2'},
              ],
              ui_type: 'dropdown',
              unit: '',
              type: 'int',
            },
          },
          {
            key: 'session_duration',
            value: '300',
            label: 'Single iPerf Session Duration',
            meta: {
              range: {min_value: 10},
              ui_type: 'range',
              unit: 'seconds',
              type: 'int',
            },
          },
          {
            key: 'test_push_rate',
            value: '200000000',
            label: 'Test Push Rate',
            meta: {
              range: {min_value: 5000000, max_value: 2000000000},
              ui_type: 'range',
              unit: 'bits/sec',
              type: 'int',
            },
          },
          {
            key: 'protocol',
            value: 'UDP',
            label: 'iPerf Traffic Protocol',
            meta: {
              dropdown: [
                {label: 'UDP', value: 'UDP'},
                {label: 'TCP', value: 'TCP'},
              ],
              ui_type: 'dropdown',
              unit: '',
              type: 'str',
            },
          },
        ],
      },
      {
        label: 'Multi-hop Test',
        test_code: 8.9,
        url_ext: '/api/start_test/',
        parameters: [
          {
            key: 'topology_id',
            value: '1',
            label: 'Topology ID',
            meta: {
              dropdown: [
                {label: 'mpk_production', value: '1'},
                {label: 'Casaba', value: '2'},
              ],
              ui_type: 'dropdown',
              unit: '',
              type: 'int',
            },
          },
          {
            key: 'session_duration',
            value: '300',
            label: 'Single iPerf Session Duration',
            meta: {
              range: {min_value: 10},
              ui_type: 'range',
              unit: 'seconds',
              type: 'int',
            },
          },
          {
            key: 'test_push_rate',
            value: '200000000',
            label: 'Test Push Rate',
            meta: {
              range: {min_value: 5000000, max_value: 2000000000},
              ui_type: 'range',
              unit: 'bits/sec',
              type: 'int',
            },
          },
          {
            key: 'protocol',
            value: 'UDP',
            label: 'iPerf Traffic Protocol',
            meta: {
              dropdown: [
                {label: 'UDP', value: 'UDP'},
                {label: 'TCP', value: 'TCP'},
              ],
              ui_type: 'dropdown',
              unit: '',
              type: 'str',
            },
          },
          {
            key: 'traffic_direction',
            value: '1',
            label: 'iPerf Traffic Direction',
            meta: {
              dropdown: [
                {label: 'BIDIRECTIONAL', value: '1'},
                {label: 'SOUTHBOUND', value: '2'},
                {label: 'NORTHBOUND', value: '3'},
              ],
              ui_type: 'dropdown',
              unit: '',
              type: 'int',
            },
          },
          {
            key: 'multi_hop_parallel_sessions',
            value: '3',
            label: 'Number of multi-hop sessions to run in parallel',
            meta: {
              dropdown: [
                {label: '1', value: '1'},
                {label: '2', value: '2'},
                {label: '3', value: '3'},
                {label: '4', value: '4'},
                {label: '5', value: '5'},
              ],
              ui_type: 'dropdown',
              unit: '',
              type: 'int',
            },
          },
          {
            key: 'multi_hop_session_iteration_count',
            value: '',
            label: 'Number of sequential multi-hop sessions',
            meta: {
              range: {min_value: 1},
              ui_type: 'range',
              unit: '',
              type: 'int',
            },
          },
          {
            key: 'pop_to_node_link',
            value: '',
            label: 'Speed Test',
            meta: {
              pop_to_node_link: {pop: '', node: ''},
              ui_type: 'pop_to_node_link',
              unit: '',
              type: 'dict',
            },
          },
        ],
      },
    ],
  };
}
