/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import PlanSingleSelectionView from '../PlanSingleSelectionView';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {TestApp, renderAsync} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockUploadANPJson} from '@fbcnms/tg-nms/app/tests/data/UploadTopology';

describe('PlanSingleSelectionView', () => {
  test('test link information is shown', async () => {
    const planTopology = JSON.parse(mockUploadANPJson());
    const {getByText} = await renderAsync(
      <TestApp>
        <NetworkPlanningContextProvider
          planTopology={planTopology}
          pendingTopology={{
            links: new Set(['link10_20']),
            sites: new Set(['site1', 'site2']),
          }}>
          <PlanSingleSelectionView />
        </NetworkPlanningContextProvider>
      </TestApp>,
    );

    expect(getByText('Site1Name to Site2Name')).toBeInTheDocument();
    // Test normal metrics appear
    expect(getByText('Capacity')).toBeInTheDocument();
    expect(getByText('1.8')).toBeInTheDocument();
    // Test name override
    expect(getByText('Link Type')).toBeInTheDocument();
    // Test value transform
    expect(getByText('Wireless Access')).toBeInTheDocument();
  });
  test('test site information is shown', async () => {
    const planTopology = JSON.parse(mockUploadANPJson());
    const {getByText} = await renderAsync(
      <TestApp>
        <NetworkPlanningContextProvider
          planTopology={planTopology}
          pendingTopology={{
            links: new Set([]),
            sites: new Set(['site1']),
          }}>
          <PlanSingleSelectionView />
        </NetworkPlanningContextProvider>
      </TestApp>,
    );

    expect(getByText('Site1Name')).toBeInTheDocument();
    expect(getByText('Latitude')).toBeInTheDocument();
    expect(getByText('38.549853')).toBeInTheDocument();
  });
});
