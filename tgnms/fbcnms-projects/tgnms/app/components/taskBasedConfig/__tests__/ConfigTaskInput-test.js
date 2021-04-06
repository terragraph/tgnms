/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ConfigTaskInput from '../ConfigTaskInput';
import {TestApp, renderAsync} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockConfigTaskContextValue} from '../../../tests/data/NetworkConfig';

afterEach(cleanup);

jest
  .spyOn(require('../../../contexts/ConfigTaskContext'), 'useConfigTaskContext')
  .mockReturnValue(
    mockConfigTaskContextValue({
      configData: [
        {
          field: ['envParams', 'CPE_INTERFACE'],
          layers: [
            {id: 'Base value', value: null},
            {id: 'Automatic node override', value: null},
            {id: 'Network override', value: 'nic0'},
            {id: 'Node override', value: null},
            {id: 'Draft value', value: 'nic0'},
          ],
          hasOverride: true,
          hasTopLevelOverride: false,
          metadata: {
            strVal: {allowedValues: ['', 'nic0', 'nic1', 'nic2']},
            type: 'STRING',
            desc:
              "Enable Open/R Router Advertisements on an interface on the device. Note: Only 'nic0' is formally supported",
            action: 'REBOOT',
          },
        },
        {
          field: [
            'statsAgentParams',
            'endpointParams',
            'kafkaParams',
            'config',
            'batchNumMessages',
          ],
          layers: [
            {id: 'Base value', value: null},
            {id: 'Automatic node override', value: null},
            {id: 'Network override', value: 100},
            {id: 'Node override', value: null},
            {id: 'Draft value', value: 100},
          ],
          hasOverride: true,
          hasTopLevelOverride: false,
          metadata: {
            type: 'INTEGER',
            intVal: {allowedRanges: [[1, 1000000]]},
            desc:
              '[batch.num.messages] Maximum number of messages batched in one MessageSet. The total MessageSet size is also limited by message.max.bytes.',
            action: 'RESTART_STATS_AGENT',
          },
        },
        {
          field: [
            'statsAgentParams',
            'endpointParams',
            'kafkaParams',
            'enabled',
          ],
          layers: [
            {id: 'Base value', value: null},
            {id: 'Automatic node override', value: null},
            {id: 'Network override', value: true},
            {id: 'Node override', value: null},
            {id: 'Draft value', value: true},
          ],
          hasOverride: true,
          hasTopLevelOverride: false,
          metadata: {
            type: 'BOOLEAN',
            desc: 'Enable data publishing to Kafka',
            action: 'RESTART_STATS_AGENT',
          },
        },
      ],
      configMetadata: {
        envParams: {
          CPE_INTERFACE: {
            strVal: {allowedValues: ['', 'nic0', 'nic1', 'nic2']},
            type: 'STRING',
            desc:
              "Enable Open/R Router Advertisements on an interface on the device. Note: Only 'nic0' is formally supported",
            action: 'REBOOT',
          },
        },
        statsAgentParams: {
          endpointParams: {
            kafkaParams: {
              config: {
                batchNumMessages: {
                  type: 'INTEGER',
                  intVal: {allowedRanges: [[1, 1000000]]},
                  desc:
                    '[batch.num.messages] Maximum number of messages batched in one MessageSet. The total MessageSet size is also limited by message.max.bytes.',
                  action: 'RESTART_STATS_AGENT',
                },
              },
              enabled: {
                type: 'BOOLEAN',
                desc: 'Enable data publishing to Kafka',
                action: 'RESTART_STATS_AGENT',
              },
            },
          },
        },
      },
    }),
  );

test('renders a drop down', async () => {
  const {getByTestId, getByText} = await renderAsync(
    <TestApp>
      <ConfigTaskInput
        configField="envParams.CPE_INTERFACE"
        label="CPE_INTERFACE"
      />
    </TestApp>,
  );
  expect(getByText('CPE_INTERFACE')).toBeInTheDocument();
  expect(getByTestId('select')).toBeInTheDocument();
});

test('renders a checkbox', async () => {
  const {getByTestId, getByText} = await renderAsync(
    <TestApp>
      <ConfigTaskInput
        configField="statsAgentParams.endpointParams.kafkaParams.enabled"
        label="Enable Kafka"
      />
    </TestApp>,
  );
  expect(getByText('Enable Kafka')).toBeInTheDocument();
  expect(getByTestId('checkbox')).toBeInTheDocument();
});

test('renders a number input', () => {
  const {getByTestId, getByText} = render(
    <TestApp>
      <ConfigTaskInput
        configField="statsAgentParams.endpointParams.kafkaParams.config.batchNumMessages"
        label="Messages Batch Number"
      />
    </TestApp>,
  );
  expect(getByText('Messages Batch Number')).toBeInTheDocument();
  expect(getByTestId('number')).toBeInTheDocument();
});

test('renders a text', async () => {
  const {getByTestId, getByText} = await renderAsync(
    <TestApp>
      <ConfigTaskInput configField="mismatchtest" label="test" />
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
  expect(getByTestId('text')).toBeInTheDocument();
});
