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
import ConfigTaskMapInput from '../ConfigTaskMapInput';
import {TestApp, renderAsync} from '@fbcnms/tg-nms/app/tests/testHelpers';

import {mockConfigTaskContextValue} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue(
    mockConfigTaskContextValue({
      configData: [
        ({
          field: ['bgpParams', 'neighbors', '0', 'asn'],
          layers: [
            {id: 'Base value', value: null},
            {id: 'Automatic node override', value: null},
            {id: 'Network override', value: null},
            {id: 'Node override', value: 65123},
            {id: 'Draft value', value: 65123},
          ],
          hasOverride: true,
          hasTopLevelOverride: true,
          metadata: {
            required: true,
            intVal: {allowedRanges: [[0, 4294967295]]},
            desc: "The neighbor's autonomous system number (remote-as)",
            type: 'INTEGER',
            action: 'REDO_POP_CONFIG',
          },
        },
        {
          field: ['bgpParams', 'neighbors', '0', 'ipv6'],
          layers: [
            {id: 'Base value', value: null},
            {id: 'Automatic node override', value: null},
            {id: 'Network override', value: null},
            {id: 'Node override', value: '2620:10d:c089:600::1'},
            {id: 'Draft value', value: '2620:10d:c089:600::1'},
          ],
          hasOverride: true,
          hasTopLevelOverride: true,
          metadata: {
            required: true,
            type: 'STRING',
            desc: "The neighbor's IPv6 address",
            action: 'REDO_POP_CONFIG',
          },
        }),
      ],
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
                  domainname: {
                    required: false,
                    desc: "The neighbor's domainname - Save a DNS lookup",
                    type: 'STRING',
                  },
                  ipv6: {
                    required: true,
                    type: 'STRING',
                    desc: "The neighbor's IPv6 address",
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

const defaultProps = {
  label: 'BGP Neighbors',
  configField: 'bgpParams.neighbors',
};

test('renders fields from config metadata', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <ConfigTaskMapInput {...defaultProps} />
    </TestApp>,
  );
  expect(getByText(defaultProps.label)).toBeInTheDocument();
  expect(getByText('New Map Key Value Pair')).toBeInTheDocument();
});

test('renders fields from previous map input', async () => {
  const {getAllByTestId, getByText, queryByText} = await renderAsync(
    <TestApp>
      <ConfigTaskMapInput {...defaultProps} />
    </TestApp>,
  );
  expect(getAllByTestId('text').length === 2);
  expect(getByText('ipv6')).toBeInTheDocument();
  expect(queryByText('domainname')).not.toBeInTheDocument();
});
