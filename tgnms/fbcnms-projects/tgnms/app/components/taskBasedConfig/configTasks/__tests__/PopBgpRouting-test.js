/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import PopBgpRouting from '../PopBgpRouting';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockConfigTaskContextValue} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {render} from '@testing-library/react';

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
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
