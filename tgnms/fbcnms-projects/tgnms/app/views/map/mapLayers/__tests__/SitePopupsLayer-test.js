/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import SitePopupsLayer from '../SitePopupsLayer';
import {Popup} from 'react-mapbox-gl';
import {TestApp, mockTopology} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

test('renders with default props', () => {
  const topology = mockTopology();
  topology.__test.addSite({
    name: 'site1',
    location: {latitude: 1, longitude: 1, accuracy: 1, altitude: 1},
  });
  render(
    <TestApp>
      <SitePopupsLayer topology={topology} />
    </TestApp>,
  );
  expect(Popup).toHaveBeenCalled();
});
