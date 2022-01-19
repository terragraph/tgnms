/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as serviceApiUtil from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import React from 'react';
import SiteDetailsPanel from '../SiteDetailsPanel';
import {
  FIG0,
  mockFig0,
  mockSite,
} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {
  TestApp,
  initWindowConfig,
  mockNetworkConfig,
  renderWithRouter,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent} from '@testing-library/react';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';

beforeEach(() => {
  initWindowConfig();
});

const {
  nodeMap,
  siteToNodesMap,
  siteMap,
  nodeToLinksMap,
  linkMap,
} = buildTopologyMaps(mockFig0());

jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useNodeConfig'), 'useNodeConfig')
  .mockReturnValue({
    loading: false,
    configData: [{field: ['test', 'param']}],
    configParams: {nodeOverridesConfig: {}, networkOverridesConfig: {}},
  });

const empty = jest.fn();
const mockOnSelectNode = jest.fn();
const mockOnEdit = jest.fn();

const commonProps = {
  networkName: '',
  networkConfig: mockNetworkConfig(),
  topology: mockFig0(),
  siteMap: siteMap,
  siteNodes: siteToNodesMap[FIG0.SITE1],
  nodeMap: nodeMap,
  networkLinkHealth: {startTime: 0, endTime: 0, events: {}},
  onSelectNode: mockOnSelectNode,
  onEdit: mockOnEdit,
  expanded: true,
  onPanelChange: empty,
  onClose: empty,
  onPin: empty,
  pinned: false,
  site: mockSite({name: FIG0.SITE1}),
  onUpdateRoutes: empty,
  nodeToLinksMap,
  linkMap,
  azimuthManager: {
    addLink: jest.fn(),
    deleteLink: jest.fn(),
    moveSite: jest.fn(),
    deleteSite: jest.fn(),
  },
  snackbars: {error: empty, success: empty, warning: empty},
};

test('renders', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <SiteDetailsPanel {...commonProps} />
    </TestApp>,
  );
  expect(getByText(FIG0.SITE1)).toBeInTheDocument();
});

describe('elements render correctly', () => {
  test('position', () => {
    const {getByText} = renderWithRouter(
      <TestApp>
        <SiteDetailsPanel {...commonProps} />
      </TestApp>,
    );
    expect(getByText('Position')).toBeInTheDocument();
    expect(getByText(/1° N 1° E/i)).toBeInTheDocument();
  });

  test('altitude, accuracy and availability', () => {
    const {getByText} = renderWithRouter(
      <TestApp>
        <SiteDetailsPanel {...commonProps} />
      </TestApp>,
    );
    expect(getByText('Altitude')).toBeInTheDocument();
    expect(getByText('Accuracy')).toBeInTheDocument();
    expect(getByText('Availability')).toBeInTheDocument();
    expect(getByText('10 meters')).toBeInTheDocument();
    expect(getByText('100 meters')).toBeInTheDocument();
    expect(getByText('0%')).toBeInTheDocument();
  });

  test('nodes render', () => {
    const {getByText} = renderWithRouter(
      <TestApp>
        <SiteDetailsPanel {...commonProps} />
      </TestApp>,
    );
    expect(getByText(FIG0.NODE1_0)).toBeInTheDocument();
    expect(getByText(FIG0.NODE1_1)).toBeInTheDocument();
  });

  test('clicking a node takes you to node details panel', () => {
    const {getByText} = renderWithRouter(
      <TestApp>
        <SiteDetailsPanel {...commonProps} />
      </TestApp>,
    );
    expect(getByText(FIG0.NODE1_0)).toBeInTheDocument();
    expect(getByText(FIG0.NODE1_1)).toBeInTheDocument();
    fireEvent.click(getByText(FIG0.NODE1_0));
    expect(mockOnSelectNode).toHaveBeenCalledWith(FIG0.NODE1_0);
  });
});

describe('Actions', () => {
  describe('Edit Site', () => {
    test('clicking Edit site calls onEdit', () => {
      const {getByText} = renderWithRouter(
        <TestApp>
          <SiteDetailsPanel {...commonProps} />
        </TestApp>,
      );
      fireEvent.click(getByText(/View Actions/i));
      expect(getByText('Topology')).toBeInTheDocument();
      fireEvent.click(getByText(/Edit Site/i));
      expect(mockOnEdit).toHaveBeenCalled();
    });
  });

  describe('Delete Site', () => {
    test('clicking Delete Site makes confirmation modal appear', () => {
      const {getByText} = renderWithRouter(
        <TestApp>
          <SiteDetailsPanel {...commonProps} />
        </TestApp>,
      );
      fireEvent.click(getByText(/View Actions/i));
      expect(getByText('Topology')).toBeInTheDocument();
      fireEvent.click(getByText(/Delete Site/i));
      expect(
        getByText(/The following items will be removed from/i),
      ).toBeInTheDocument();
    });

    test('confirmation modal appears with proper values', () => {
      const {getByText} = renderWithRouter(
        <TestApp>
          <SiteDetailsPanel {...commonProps} />
        </TestApp>,
      );
      fireEvent.click(getByText(/View Actions/i));
      fireEvent.click(getByText(/Delete Site/i));
      expect(getByText(/Remove 1 site/i)).toBeInTheDocument();
      expect(getByText(/Remove 2 nodes/i)).toBeInTheDocument();
      expect(getByText(/Remove 2 links/i)).toBeInTheDocument();
    });

    test('clicking Delete Site and remove in modal triggers apiRequests', async () => {
      const apiRequestMock = jest.spyOn(serviceApiUtil, 'apiRequest');
      apiRequestMock.mockResolvedValue({message: 'success'});

      const {getByText} = renderWithRouter(
        <TestApp>
          <SiteDetailsPanel {...commonProps} />
        </TestApp>,
      );
      fireEvent.click(getByText(/View Actions/i));
      fireEvent.click(getByText(/Delete Site/i));
      await act(async () => {
        fireEvent.click(getByText(/remove 5 topology elements/i));
      });
      expect(apiRequestMock).toHaveBeenCalled();
      expect(commonProps.azimuthManager.deleteSite).toHaveBeenCalledWith({
        siteName: 'site1',
      });
    });
  });
});
