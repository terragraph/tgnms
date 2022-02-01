/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import SitesFileFeaturesLayer, {
  SITESFILE_CLICK_LAYER_ID,
  SITESFILE_SOURCE_ID,
} from '../SitesFileFeaturesLayer';
import {
  MapContextWrapper,
  TestApp,
  mockSitesFile,
  mockSitesFileRow,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {
  NetworkPlanningContextProvider,
  useNetworkPlanningContext,
} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {act} from '@testing-library/react';
import {
  getLayerCallback,
  getSourceFeatureCollection,
} from '@fbcnms/tg-nms/app/tests/mapHelpers';

let networkContextRef = {current: null};
beforeEach(() => {
  networkContextRef = {current: null};
});

describe('SitesFileFeaturesLayer', () => {
  test('renders the sitesfile', async () => {
    const {container} = await testRender();
    const {features: sitesFileFeatures} = getSourceFeatureCollection(
      container,
      SITESFILE_SOURCE_ID,
    );
    expect(sitesFileFeatures.length).toBe(3);
  });
  test('updates if the pending sitesfile updates', async () => {
    const {container} = await testRender();
    let sitesFileFeatures = getSourceFeatureCollection(
      container,
      SITESFILE_SOURCE_ID,
    ).features;
    expect(sitesFileFeatures.length).toBe(3);
    act(() => {
      const sitesFile = mockSitesFile();
      sitesFile.sites.push(mockSitesFileRow({id: 10, name: 'new-site'}));
      networkContextRef.current?.setPendingSitesFile(sitesFile);
    });
    sitesFileFeatures = getSourceFeatureCollection(
      container,
      SITESFILE_SOURCE_ID,
    ).features;
    expect(sitesFileFeatures.length).toBe(4);
  });

  test('clicking a site selects it', async () => {
    // const ref: PlanningContextRef = {};
    await testRender();
    const onClick = getLayerCallback(SITESFILE_CLICK_LAYER_ID, 'onClick');
    expect(networkContextRef.current?.selectedSites.length).toBe(0);
    act(() => {
      onClick({
        originalEvent: {metaKey: false},
        features: [
          {
            properties: {sitesfile_id: 0},
          },
        ],
      });
    });
    expect(networkContextRef.current?.selectedSites.length).toBe(1);
    act(() => {
      onClick({
        originalEvent: {metaKey: true},
        features: [
          {
            properties: {sitesfile_id: 1},
          },
        ],
      });
    });
    expect(networkContextRef.current?.selectedSites.length).toBe(2);
  });
});

function testRender() {
  // setup the planningcontext using hooks
  function SetupContext() {
    const ctx = useNetworkPlanningContext();
    React.useEffect(() => {
      ctx.setPendingSitesFile(mockSitesFile());
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
  }
  return renderAsync(
    <TestApp>
      <NetworkPlanningContextProvider __ref={networkContextRef}>
        <MapContextWrapper>
          <SitesFileFeaturesLayer />
          <SetupContext />
        </MapContextWrapper>
      </NetworkPlanningContextProvider>
    </TestApp>,
  );
}
