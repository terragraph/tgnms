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
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

import ModalImageRow from '../ModalImageRow';

test('removes M prefix and PRE suffix from avatar, keeps numeric suffix', () => {
  const {queryByText, getByText} = render(
    <TestApp>
      <ModalImageRow
        image={{
          versionNumber: 'M46.PRE',
          name: '',
          magnetUri: '',
          md5: '',
          hardwareBoardIds: [],
        }}
        menuItems={[]}
      />
      <ModalImageRow
        image={{
          versionNumber: 'M44.1',
          name: '',
          magnetUri: '',
          md5: '',
          hardwareBoardIds: [],
        }}
        menuItems={[]}
      />
    </TestApp>,
  );

  expect(queryByText('M46')).not.toBeInTheDocument();
  expect(getByText('46')).toBeInTheDocument();
  expect(getByText('44.1')).toBeInTheDocument();
});
