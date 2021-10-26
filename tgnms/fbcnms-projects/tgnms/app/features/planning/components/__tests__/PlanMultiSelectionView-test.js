/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import PlanMultiSelectionView from '../PlanMultiSelectionView';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {TestApp, renderAsync} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent} from '@testing-library/react';
import {mockUploadANPJson} from '@fbcnms/tg-nms/app/tests/data/UploadTopology';

describe('PlanMultiSelectionView', () => {
  test('test removing pending topology elements', async () => {
    const planTopology = JSON.parse(mockUploadANPJson());
    const {getByText, queryAllByTestId, queryByText} = await renderAsync(
      <TestApp>
        <NetworkPlanningContextProvider
          planTopology={planTopology}
          pendingTopology={{
            links: new Set(['link10_20']),
            sites: new Set(['site3']),
          }}>
          <PlanMultiSelectionView />
        </NetworkPlanningContextProvider>
      </TestApp>,
    );

    // Assert expected elements are there at first.
    act(() => {
      fireEvent.click(getByText('3 Sites'));
    });
    expect(getByText('site1')).toBeInTheDocument();
    expect(getByText('site2')).toBeInTheDocument();
    expect(getByText('site3')).toBeInTheDocument();
    act(() => {
      fireEvent.click(getByText('1 Links'));
    });
    expect(queryByText('site1 to site2')).toBeInTheDocument();

    // Remove Link
    act(() => {
      fireEvent.click(queryAllByTestId('remove-plan-item')[3]);
    });
    expect(getByText('site3')).toBeInTheDocument();
    expect(queryByText('site1')).not.toBeInTheDocument();
    expect(queryByText('site2')).not.toBeInTheDocument();
    expect(queryByText('site1 to site2')).not.toBeInTheDocument();
  });
});
