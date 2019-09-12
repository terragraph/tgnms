/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import OverviewPanel from '../OverviewPanel';
import React from 'react';
import {cleanup, render} from '@testing-library/react';
import {
  initWindowConfig,
  mockNetworkConfig,
  mockTopology,
} from '../../../tests/testHelpers';

afterEach(cleanup);

describe('OverviewPanel', () => {
  beforeEach(() => {
    initWindowConfig();
  });

  const commonProps = {
    expanded: true,
    networkConfig: mockNetworkConfig(),
    networkLinkHealth: {startTime: 0, endTime: 0, events: {}},
    onPanelChange: () => {},
    onPanelChange: () => {},
    onViewIgnitionState: () => {},
    onViewAccessPointList: () => {},
  };

  test('renders', () => {
    const {getByText} = render(<OverviewPanel {...commonProps} />);
    expect(getByText('overview')).toBeInTheDocument();
  });

  describe('Network', () => {
    test('shows 100% if all links are healthy', () => {
      const topology = figureZeroTopology();
      const mockNetworkHealth = topology.links.reduce((health, link) => {
        health[link.name] = {
          linkAvailForData: 100,
        };
        return health;
      }, {});

      const {getByText} = render(
        <OverviewPanel
          {...commonProps}
          networkConfig={mockNetworkConfig({
            topology,
          })}
          networkLinkHealth={{
            startTime: 0,
            endTime: 0,
            events: mockNetworkHealth,
          }}
        />,
      );

      expect(getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Services', () => {
    test('shows query service online status', () => {
      const {rerender, getByTestId} = render(
        <OverviewPanel
          {...commonProps}
          networkConfig={mockNetworkConfig({
            query_service_online: true,
          })}
        />,
      );

      expect(getByTestId('queryservice-status').textContent).toBe('Online');

      rerender(
        <OverviewPanel
          {...commonProps}
          networkConfig={mockNetworkConfig({
            query_service_online: false,
          })}
        />,
      );

      expect(getByTestId('queryservice-status').textContent).toBe('Offline');
    });

    test('shows controller online status', () => {
      const {rerender, getByTestId} = render(
        <OverviewPanel
          {...commonProps}
          networkConfig={mockNetworkConfig({
            controller_online: true,
          })}
        />,
      );
      expect(getByTestId('controller-status').textContent).toBe('Online');

      rerender(
        <OverviewPanel
          {...commonProps}
          networkConfig={mockNetworkConfig({
            controller_online: false,
          })}
        />,
      );
      expect(getByTestId('controller-status').textContent).toBe('Offline');
    });
  });
});

function figureZeroTopology() {
  const topology = mockTopology();
  topology.__test
    .addNode({
      name: 'node1',
      site_name: 'site1',
    })
    .addNode({
      name: 'node2',
      site_name: 'site2',
    })
    .addNode({
      name: 'node3',
      site_name: 'site3',
    })
    .addNode({
      name: 'node4',
      site_name: 'site4',
    })
    .addLink({
      a_node_name: 'node1',
      z_node_name: 'node2',
    })
    .addLink({
      a_node_name: 'node2',
      z_node_name: 'node3',
    })
    .addLink({
      a_node_name: 'node3',
      z_node_name: 'node4',
    })
    .addLink({
      a_node_name: 'node4',
      z_node_name: 'node1',
    });
  return topology;
}
