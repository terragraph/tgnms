/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import AddNodePanel from '../AddNodePanel';
import {TestApp} from '../../../tests/testHelpers';
import {
  mockNetworkConfig,
  mockTopology,
} from '../../../tests/data/NetworkConfig';
import {render} from '@testing-library/react';

const commonProps = {
  expanded: true,
  formType: 'CREATE',
  initialParams: {},
  networkConfig: mockNetworkConfig(),
  networkName: 'test',
  onPanelChange: jest.fn(),
  onClose: jest.fn(),
  topology: mockTopology(),
};

test('renders with controller version before m29', () => {
  render(
    <TestApp>
      <AddNodePanel {...commonProps} ctrlVersion="RELEASE_M28_PRE" />
    </TestApp>,
  );
});
