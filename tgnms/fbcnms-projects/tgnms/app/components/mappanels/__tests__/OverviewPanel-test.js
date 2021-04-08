/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import OverviewPanel from '../OverviewPanel';
import React from 'react';
import {
  TestApp,
  initWindowConfig,
  mockNetworkConfig,
  mockTopology,
} from '../../../tests/testHelpers';
import {render} from '@testing-library/react';

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
    const {getByText} = render(<OverviewPanel {...commonProps} />, {
      wrapper: TestApp,
    });
    expect(getByText(/overview/i)).toBeInTheDocument();
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
        {wrapper: TestApp},
      );

      expect(getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Services', () => {
    test('shows Prometheus online status', () => {
      const {rerender, getByTestId} = render(
        <OverviewPanel
          {...commonProps}
          networkConfig={mockNetworkConfig({
            prometheus_online: true,
          })}
        />,
        {wrapper: TestApp},
      );

      expect(getByTestId('prometheus-status').textContent).toBe('Online');

      rerender(
        <OverviewPanel
          {...commonProps}
          networkConfig={mockNetworkConfig({
            prometheus_online: false,
          })}
        />,
      );

      expect(getByTestId('prometheus-status').textContent).toBe('Offline');
    });

    test('shows controller online status', () => {
      const {rerender, getByTestId} = render(
        <OverviewPanel
          {...commonProps}
          networkConfig={mockNetworkConfig({
            controller_online: true,
          })}
        />,
        {wrapper: TestApp},
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

    test('doesnt crash if hastate.primary/backup is null', () => {
      const {rerender, getByTestId} = render(
        <OverviewPanel
          {...commonProps}
          networkConfig={mockNetworkConfig({
            controller_online: true,
            high_availability: {
              primary: null,
              backup: null,
            },
          })}
        />,
        {wrapper: TestApp},
      );
      expect(getByTestId('controller-status').textContent).toBe('Online');
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
