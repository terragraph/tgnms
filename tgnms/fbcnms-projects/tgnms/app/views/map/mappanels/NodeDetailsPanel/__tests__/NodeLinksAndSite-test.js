/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NodeLinksAndSite from '../NodeLinksAndSite';
import React from 'react';
import {TestApp, renderAsync} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent} from '@testing-library/react';
import {
  mockLink,
  mockNode,
  mockTopology,
} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

const defaultProps = {
  node: mockNode({name: 'testNode', site_name: '11L922'}),
  topology: mockTopology({
    name: 'Tower Q',
    links: [
      mockLink({
        name: 'link1',
        a_node_name: '11M237.2',
        z_node_name: 'testNode',
      }),
      mockLink({
        name: 'link2',
        a_node_name: '11M237.1',
        z_node_name: 'testNode',
      }),
    ],
  }),
  onSelectLink: jest.fn(() => {}),
  onSelectSite: jest.fn(() => {}),
};

test('renders empty without crashing', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <NodeLinksAndSite
        {...defaultProps}
        node={mockNode()}
        topology={mockTopology()}
      />
      ,
    </TestApp>,
  );
  expect(getByText(',')).toBeInTheDocument();
});

test('renders with links and site', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <NodeLinksAndSite {...defaultProps} />
    </TestApp>,
  );

  expect(getByText('11L922')).toBeInTheDocument();
  expect(getByText('link1')).toBeInTheDocument();
  expect(getByText('link2')).toBeInTheDocument();
});

test('clicking link', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <NodeLinksAndSite {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('11L922')).toBeInTheDocument();
  expect(getByText('link1')).toBeInTheDocument();
  expect(getByText('link2')).toBeInTheDocument();
  fireEvent.click(getByText('link1'));
  expect(defaultProps.onSelectLink).toHaveBeenCalled();
});

test('clicking site', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <NodeLinksAndSite {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('11L922')).toBeInTheDocument();
  expect(getByText('link1')).toBeInTheDocument();
  expect(getByText('link2')).toBeInTheDocument();
  fireEvent.click(getByText('11L922'));
  expect(defaultProps.onSelectSite).toHaveBeenCalled();
});
