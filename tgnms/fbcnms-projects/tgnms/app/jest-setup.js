/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
