/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import '@testing-library/jest-dom';
import {cleanup} from '@testing-library/react';
beforeEach(() => {
  jest.clearAllMocks();
});
afterEach(() => {
  cleanup();
});
