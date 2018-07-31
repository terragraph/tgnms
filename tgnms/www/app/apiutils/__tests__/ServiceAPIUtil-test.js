import axios from 'axios';
import {apiServiceRequest} from '../ServiceAPIUtil';

jest.mock('axios');

const GENERIC_SUCCESS_RESPONSE = {
  data: {
    success: true,
  },
};

const GENERIC_FAILURE_RESPONSE = {
  data: {
    success: false,
    message: 'generic failure',
  },
};

test('passes through data upon success', async () => {
  axios.post.mockImplementation(async (url, data, config) => {
    expect(url).toEqual('/apiservice/test-topology/default/api/getTopology');
    return GENERIC_SUCCESS_RESPONSE;
  });

  const response = await apiServiceRequest('test-topology', 'getTopology');
  expect(response.data.success).toEqual(true);
});

test('raises exception when success is false', async () => {
  axios.post.mockImplementation(async (url, data, config) => {
    return GENERIC_FAILURE_RESPONSE;
  });
  expect.assertions(1);
  try {
    await apiServiceRequest('test-topology', 'getTopology');
  } catch (error) {
    expect(error.response.data.message).toEqual('generic failure');
  }
});
