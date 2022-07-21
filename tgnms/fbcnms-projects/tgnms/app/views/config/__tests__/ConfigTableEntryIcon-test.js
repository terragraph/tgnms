/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ConfigTableEntryIcon from '../ConfigTableEntryIcon';
import {CONFIG_LAYER} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

const defaultProps = {
  renderedLayers: [],
  hasDraftOverride: false,
};

test('renders no icons', async () => {
  const {queryByTestId} = render(
    <TestApp>
      <ConfigTableEntryIcon {...defaultProps} />
    </TestApp>,
  );
  expect(queryByTestId('table-entry-icon')).not.toBeInTheDocument();
});

test('renders one icon', async () => {
  const {getByTestId} = render(
    <TestApp>
      <ConfigTableEntryIcon
        {...defaultProps}
        renderedLayers={[{id: CONFIG_LAYER.AUTO_NODE, value: null}]}
      />
    </TestApp>,
  );
  expect(getByTestId('table-entry-icon')).toBeInTheDocument();
});

test('renders multiple icons', async () => {
  const {getAllByTestId} = render(
    <TestApp>
      <ConfigTableEntryIcon
        {...defaultProps}
        renderedLayers={[
          {id: CONFIG_LAYER.AUTO_NODE, value: null},
          {id: CONFIG_LAYER.DRAFT, value: null},
        ]}
        hasDraftOverride={true}
      />
    </TestApp>,
  );
  expect(getAllByTestId('table-entry-icon').length == 2);
});
