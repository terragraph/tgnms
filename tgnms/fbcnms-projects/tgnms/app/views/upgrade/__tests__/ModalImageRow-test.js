/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import * as React from 'react';
import {TestApp} from '../../../tests/testHelpers';
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
