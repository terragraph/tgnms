/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

/**
 * Bare-minimum client-side axios mock implementation. You should almost always
 * override these in your tests.
 *
 * For now return 200 and an empty array to keep existing tests from breaking
 */
const axiosMockImpl = () =>
  Promise.resolve({data: [], status: 200, statusText: 'AXIOS MOCK RESPONSE'});
const Axios = jest.fn(axiosMockImpl);
Axios.get = jest.fn(axiosMockImpl);
Axios.post = jest.fn(axiosMockImpl);
Axios.put = jest.fn(axiosMockImpl);
Axios.delete = jest.fn(axiosMockImpl);
Axios.head = jest.fn(axiosMockImpl);
Axios.default = Axios;
Axios.CancelToken = {
  source: jest.fn(() => ({cancel: jest.fn(), token: {}})),
};
module.exports = Axios;
