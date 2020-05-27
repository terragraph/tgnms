/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import AddLinkPanel from '../AddLinkPanel';
import {TestApp} from '../../../tests/testHelpers';
import {buildTopologyMaps} from '../../../helpers/TopologyHelpers';
import {
  mockMultiHop,
  mockNetworkConfig,
} from '../../../tests/data/NetworkConfig';
import {render} from '@testing-library/react';

const commonProps = {
  expanded: true,
  formType: 'CREATE',
  initialParams: {},
  networkConfig: mockNetworkConfig(),
  networkName: 'test',
  nodeMap: {},
  onPanelChange: jest.fn(),
  onClose: jest.fn(),
  topology: mockMultiHop(12, true),
};
const topologyMaps = buildTopologyMaps(commonProps.topology);
commonProps.nodeMap = topologyMaps.nodeMap;

test('renders', () => {
  render(
    <TestApp>
      <AddLinkPanel {...commonProps} />
    </TestApp>,
  );
});
