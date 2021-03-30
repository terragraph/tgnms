/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import PopBgpRouting from '../PopBgpRouting';
import {TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockConfigTaskContextValue} from '../../../../tests/data/NetworkConfig';

afterEach(cleanup);

jest
  .spyOn(
    require('../../../../contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue(
    mockConfigTaskContextValue({
      configMetadata: {
        bgpParams: {
          neighbors: {
            action: 'REDO_POP_CONFIG',
            desc:
              'The list of BGP neighbors. Map keys can be arbitrary strings and are ignored.',
            mapVal: {
              action: 'REDO_POP_CONFIG',
              desc:
                'The list of BGP neighbors. Map keys can be arbitrary strings and are ignored.',
              objVal: {
                properties: {
                  asn: {
                    required: true,
                    desc: "The neighbor's autonomous system number (remote-as)",
                    type: 'INTEGER',
                    action: 'REDO_POP_CONFIG',
                  },
                },
                type: 'OBJECT',
              },
              type: 'MAP',
            },
          },
        },
      },
    }),
  );

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <PopBgpRouting />
    </TestApp>,
  );
  expect(getByText('POP Interface')).toBeInTheDocument();
});
