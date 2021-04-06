/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ConfigTaskMapInput from '../ConfigTaskMapInput';
import {TestApp, renderAsync} from '../../../tests/testHelpers';

import {mockConfigTaskContextValue} from '../../../tests/data/NetworkConfig';

jest
  .spyOn(require('../../../contexts/ConfigTaskContext'), 'useConfigTaskContext')
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
