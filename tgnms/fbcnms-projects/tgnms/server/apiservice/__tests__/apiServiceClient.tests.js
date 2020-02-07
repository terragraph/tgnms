/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {BackgroundRequest, Request} from '../apiServiceClient';

import {ApiServiceClient} from '../apiServiceClient';
const TokenSet = jest.genMockFromModule('openid-client/lib/token_set');
import axiosMock from 'axios';
const {awaitClient} = require('../../user/oidc');

jest.mock('axios');
jest.mock('../../user/oidc', () => {
  const ClientMock = jest.genMockFromModule('openid-client/lib/client');
  const cachedClient = new ClientMock();
  return {
    awaitClient: async () => cachedClient,
  };
});

jest.mock('../../config', () => ({
  LOGIN_ENABLED: true,
}));

beforeEach(async () => {
  jest.clearAllMocks();
  jest.resetModules();
  axiosMock.post.mockImplementation(() => Promise.resolve({data: {}}));
});

describe('Background Requests', () => {
  test('with no service credentials cached, requests service access token', async () => {
    // $FlowFixMe uncovered by move to flow 0.102.0
    const oidcMock = await awaitClient();
    oidcMock.grant.mockReturnValueOnce(new TokenSet());

    const serviceClient = new ApiServiceClient();
    const result = await serviceClient.backgroundRequest(
      fakeBackgroundRequest(),
    );

    expect(result.success).toBe(true);
    expect(axiosMock.post).toHaveBeenCalled();
    /**
     * ensure that the proper oidc client methods
     * have been called to validate the token
     **/
    expect(oidcMock.grant).toHaveBeenCalledWith({
      grant_type: 'client_credentials',
    });
  });

  test('with expired service credentials cached, refreshes access token', async () => {
    // setup mocks
    // $FlowFixMe uncovered by move to flow 0.102.0
    const oidcMock = await awaitClient();
    const expiredTokenMock = new TokenSet();
    const fakeRefreshToken = Symbol();
    expiredTokenMock.refresh_token = fakeRefreshToken;
    expiredTokenMock.expired.mockReturnValueOnce(true);
    oidcMock.refresh.mockReturnValueOnce(new TokenSet());

    // setup client
    const serviceClient = new ApiServiceClient();
    serviceClient.serviceCredentials = expiredTokenMock;

    const result = await serviceClient.backgroundRequest(
      fakeBackgroundRequest(),
    );
    expect(result.success).toBe(true);
    expect(oidcMock.refresh).toHaveBeenCalledWith(fakeRefreshToken);
  });

  test('with expired refresh token, requests new service credentials', async () => {
    const serviceClient = new ApiServiceClient();
    // $FlowFixMe uncovered by move to flow 0.102.0
    const oidcMock = await awaitClient();

    const mockExpiredToken = new TokenSet();
    mockExpiredToken.expired.mockReturnValueOnce(true);
    mockExpiredToken.access_token = '<<test token>>';
    mockExpiredToken.refresh_token = '<<test token>>';

    const mockNewToken = new TokenSet();
    mockNewToken.expired.mockReturnValueOnce(false);
    mockNewToken.access_token = '<<test token>>';
    mockNewToken.refresh_token = '<<test token>>';

    // using refresh token should fail
    oidcMock.refresh.mockRejectedValueOnce(new Error('refresh expired'));
    oidcMock.grant.mockResolvedValueOnce(mockNewToken);

    serviceClient.serviceCredentials = mockExpiredToken;

    const result = await serviceClient.backgroundRequest(
      fakeBackgroundRequest(),
    );
    expect(oidcMock.grant).toHaveBeenCalledWith({
      grant_type: 'client_credentials',
    });
    expect(result.success).toBe(true);
    expect(axiosMock.post.mock.calls[0][2]).toBeDefined();
    expect(axiosMock.post.mock.calls[0][2].headers.Authorization).toBe(
      `Bearer <<test token>>`,
    );
  });

  test('with valid service credentials, does not attempt to refresh or request a grant', async () => {
    const oidcMock = await awaitClient();
    const mockToken = new TokenSet();
    mockToken.expired.mockReturnValue(false);
    mockToken.access_token = '<<test token>>';
    const serviceClient = new ApiServiceClient();
    serviceClient.serviceCredentials = mockToken;
    const result = await serviceClient.backgroundRequest(
      fakeBackgroundRequest(),
    );
    expect(result.success).toBe(true);
    expect(oidcMock.refresh).not.toHaveBeenCalled();
    expect(oidcMock.grant).not.toHaveBeenCalled();
  });

  test('with valid service credentials, adds authorization header to api service requests', async () => {
    const serviceClient = new ApiServiceClient();
    const mockToken = new TokenSet();
    mockToken.expired.mockReturnValueOnce(false);
    mockToken.access_token = '<<test token>>';
    serviceClient.serviceCredentials = mockToken;

    const result = await serviceClient.backgroundRequest(
      fakeBackgroundRequest(),
    );
    expect(result.success).toBe(true);
    expect(axiosMock.post.mock.calls[0][2]).toBeDefined();
    expect(axiosMock.post.mock.calls[0][2].headers.Authorization).toBe(
      `Bearer <<test token>>`,
    );
  });

  test('with login disabled, does not add authorization header or call any oidc methods', async () => {
    /**
     * We redefine the mocks here and dynamically require apiServiceClient
     * so that we can mock and override config.
     **/
    jest.doMock('../../config', () => ({
      LOGIN_ENABLED: false,
    }));
    jest.doMock('axios', () => ({
      post: jest.fn(() => Promise.resolve({data: {}})),
    }));
    const ApiServiceClient = require('../apiServiceClient').ApiServiceClient;
    const serviceClient = new ApiServiceClient();
    const result = await serviceClient.backgroundRequest(
      fakeBackgroundRequest(),
    );
    expect(result.success).toBe(true);
  });
});

describe('User Requests', () => {
  test('with login enabled, missing access token throws error', async () => {
    const serviceClient = new ApiServiceClient();
    expect(
      serviceClient.userRequest(
        fakeUserRequest({
          accessToken: '',
        }),
      ),
    ).rejects.toEqual(new Error('missing access token for user request'));
  });

  test('with login disabled, missing access token does not throw error', () => {
    /**
     * We redefine the mocks here and dynamically require apiServiceClient
     * so that we can mock and override config.
     **/
    jest.doMock('../../config', () => ({
      LOGIN_ENABLED: false,
    }));
    const ApiServiceClient = require('../apiServiceClient').ApiServiceClient;
    const serviceClient = new ApiServiceClient();
    expect(
      serviceClient.userRequest(
        fakeUserRequest({
          accessToken: '',
        }),
      ),
    ).resolves;
  });

  test('adds authorization header', async () => {
    const serviceClient = new ApiServiceClient();
    await serviceClient.userRequest(fakeUserRequest());
    expect(axiosMock.post).toHaveBeenCalledWith(
      `http://test:8080/api/testmethod`,
      {},
      {
        headers: {Authorization: `Bearer abc`},
      },
    );
  });
});

function fakeBackgroundRequest(
  merge?: $Shape<BackgroundRequest>,
): $Shape<BackgroundRequest> {
  return {
    networkName: '',
    isPrimaryController: true,
    host: 'test',
    port: '8080',
    apiMethod: 'testmethod',
    data: {},
    ...merge,
  };
}

function fakeUserRequest(merge?: $Shape<Request>): $Shape<Request> {
  return {
    host: 'test',
    port: '8080',
    apiMethod: 'testmethod',
    data: {},
    accessToken: 'abc',
    ...merge,
  };
}
