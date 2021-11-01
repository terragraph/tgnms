/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import * as axiosMock from 'axios';
jest.mock('axios');
import ANPAPIClient from '../ANPAPIClient';
import type {ANPAPIClientConfig} from '../ANPAPIClient';

const testClientConfig = {
  anpBaseURL: 'https://terragraph-api.fbconnectivity.com',
  oAuthBaseURL: 'https://graph.facebook.com',
  partnerId: '520563995108782',
  oAuthCredentials: {
    client_id: 'test',
    client_secret: '12345',
  },
};

beforeEach(() => {
  jest.resetAllMocks();
});

test('throws an error when initialized with invalid config', () => {
  expect(() => makeClient()).not.toThrow();
  // empty object
  expect(() => makeClient({})).toThrow();
  // missing oauth creds
  expect(() =>
    makeClient({anpBaseURL: '', oAuthBaseURL: '', partnerId: 'null'}),
  ).toThrow();
});
test('getInputFile works', async () => {
  jest.spyOn(axiosMock, 'default').mockResolvedValue({status: 200, data: {}});
  const client = makeClient();
  client.accessToken = 'abc123';
  await client.getInputFile('myInputFileId');
  expect(axiosMock).toHaveBeenLastCalledWith({
    method: 'GET',
    url:
      'https://terragraph-api.fbconnectivity.com/myInputFileId?fields=file_name%2Cfile_extension%2Cfile_role%2Cfile_status',
    headers: {
      Authorization: 'OAuth abc123',
    },
    responseType: 'json',
    data: undefined,
  });
});
describe('OAuth', () => {
  test('all ANP requests contain the OAuth access token', async () => {
    jest.spyOn(axiosMock, 'default').mockResolvedValue({status: 200, data: {}});
    const client = makeClient();
    client.accessToken = 'abc123';
    await client.makeRequest({edge: 'files', id: '123', method: 'GET'});
    expect(axiosMock).toHaveBeenLastCalledWith({
      method: 'GET',
      url: 'https://terragraph-api.fbconnectivity.com/123/files',
      headers: {
        Authorization: 'OAuth abc123',
      },
      responseType: 'json',
      data: undefined,
    });
  });
  test('all Graph requests contain the OAuth access token', async () => {
    jest.spyOn(axiosMock, 'default').mockResolvedValue({status: 200, data: {}});
    const client = makeClient();
    client.accessToken = 'abc123';
    await client.graphRequest({endpoint: 'files', method: 'GET'});
    expect(axiosMock).toHaveBeenLastCalledWith({
      method: 'GET',
      url: 'https://graph.facebook.com/files',
      headers: {
        Authorization: 'OAuth abc123',
      },
      responseType: 'json',
      data: undefined,
    });
  });
  test('if there is no auth token, request a new one', async () => {
    jest.spyOn(axiosMock, 'default').mockImplementation(config => {
      // return a fake access token for OAuth requests
      if (
        config.url.includes('https://graph.facebook.com/oauth/access_token')
      ) {
        return Promise.resolve({status: 200, data: mockAccessToken()});
      }
      return Promise.resolve({status: 200, data: {}});
    });
    const client = makeClient();
    await client.makeRequest({edge: 'files', id: '123', method: 'GET'});
    expect(axiosMock).toHaveBeenCalledTimes(2);
    expect(axiosMock).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      url:
        'https://graph.facebook.com/oauth/access_token' +
        '?client_id=test&client_secret=12345&grant_type=client_credentials',
    });
    expect(axiosMock).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      url: 'https://terragraph-api.fbconnectivity.com/123/files',
      headers: {
        Authorization: 'OAuth abc123',
      },
      responseType: 'json',
      data: undefined,
    });
  });
});

function makeClient(mockConfig?: $Shape<ANPAPIClientConfig>) {
  return new ANPAPIClient(mockConfig ?? testClientConfig);
}
function mockAccessToken(): {|access_token: string|} {
  return {access_token: 'abc123'};
}
