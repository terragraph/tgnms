/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

/**
 * Polls the async `fn` until `fnCondition` is true.
 *
 * `numCallsTimeout` is the number of times to poll before
 * we quit.
 *
 * Modified from https://dev.to/jakubkoci/polling-with-async-await-25p4
 */
export async function pollConditionally({
  fn,
  fnCondition,
  ms = 1000,
  numCallsTimeout = 10,
}: {
  fn: () => Promise<any>,
  fnCondition: any => boolean,
  ms: number,
  numCallsTimeout?: number,
}) {
  let result = await fn();
  let numCalls = 0;
  while (!fnCondition(result) && numCalls < numCallsTimeout) {
    await wait(ms);
    result = await fn();
    numCalls++;
  }
  if (fnCondition(result)) {
    return result;
  } else {
    throw new Error('Timeout: Maximum number of calls reached.');
  }
}

function wait(ms = 1000) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
