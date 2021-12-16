/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import SiteForm from '../SiteForm';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';
import {mockNetworkConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

jest.mock('@fbcnms/tg-nms/app/contexts/NetworkContext', () => ({
  useNetworkContext: () => ({
    networkName: 'testNetwork',
    networkConfig: mockNetworkConfig(),
  }),
}));

const mockUpdateTopology = jest.fn();
jest.mock('@fbcnms/tg-nms/app/contexts/TopologyBuilderContext', () => ({
  useTopologyBuilderContext: () => ({
    elementType: '',
    updateTopology: mockUpdateTopology,
    newTopology: {
      site: {name: 'testSite'},
      nodes: [{name: 'site1-0'}],
      links: [],
    },
    initialParams: {},
  }),
}));

test('render without crashing', () => {
  const {getByLabelText} = render(
    <TestApp>
      <SiteForm />
    </TestApp>,
  );
  expect(getByLabelText('Site Name')).toBeInTheDocument();
});

test('when form values are selected, update is called correctly', () => {
  const {getByTestId} = render(
    <TestApp>
      <SiteForm />
    </TestApp>,
  );
  act(() => {
    fireEvent.change(getByTestId('site-name-input').children[1].children[0], {
      target: {value: 'newName'},
    });
  });
  expect(mockUpdateTopology).toHaveBeenCalledWith({
    site: {
      name: 'newName',
      location: {
        accuracy: 40000000,
        altitude: 0,
        latitude: 0,
        longitude: 0,
      },
    },
  });
});
