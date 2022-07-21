/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
          mapOptions={{
            enabledStatusTypes: {
              PROPOSED: true,
              UNAVAILABLE: true,
              CANDIDATE: true,
            },
          }}
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
    expect(getByText('Site1Name')).toBeInTheDocument();
    expect(getByText('Site2Name')).toBeInTheDocument();
    expect(getByText('Site3Name')).toBeInTheDocument();
    act(() => {
      fireEvent.click(getByText('1 Links'));
    });
    expect(queryByText('Site1Name to Site2Name')).toBeInTheDocument();

    // Remove Link
    act(() => {
      fireEvent.click(queryAllByTestId('remove-plan-item')[3]);
    });
    expect(getByText('Site3Name')).toBeInTheDocument();
    expect(queryByText('Site1Name')).not.toBeInTheDocument();
    expect(queryByText('Site2Name')).not.toBeInTheDocument();
    expect(queryByText('Site1Name to Site2Name')).not.toBeInTheDocument();
  });
});
