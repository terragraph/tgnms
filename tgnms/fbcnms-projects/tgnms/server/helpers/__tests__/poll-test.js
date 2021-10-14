/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {pollConditionally} from '../poll';

describe('poll', () => {
  it('returns result of the last call', async () => {
    const fn = createApiStub();
    const fnCondition = result => result >= 3;
    const finalResult = await pollConditionally({fn, fnCondition, ms: 100});
    expect(finalResult).toEqual(3);
  });

  it('calls api many times while condition is satisfied', async () => {
    const fn = createApiStub();
    const fnCondition = result => result >= 3;
    await pollConditionally({fn, fnCondition, ms: 100});
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('times out if too many calls', async () => {
    const fn = createApiStub();
    const fnCondition = result => result >= 3;
    await expect(
      pollConditionally({fn, fnCondition, ms: 100, numCallsTimeout: 1}),
    ).rejects.toThrow('Timeout: Maximum number of calls reached.');
  });

  function createApiStub() {
    let counter = 0;
    const testApi = () => {
      counter++;
      return Promise.resolve(counter);
    };
    return jest.fn(() => testApi());
  }
});
