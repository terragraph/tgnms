/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import QoSInterfaceConfig from '../QoSInterfaceConfig';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';
import {mockConfigTaskContextValue} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

const onUpdateMock = jest.fn();
jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue(
    mockConfigTaskContextValue({
      onUpdate: onUpdateMock,
      configData: [
        {
          field: ['cpeParams', 'policers', 'test_cpe', '0', 'cir'],
          hasOverride: false,
          hasTopLevelOverride: false,
          layers: [{id: 'Base value', value: 100}],
          metadata: {action: 'RESTART_SQUIRE', desc: 'test', type: 'STRING'},
        },
      ],
      configMetadata: {
        cpeConfig: {
          mapVal: {
            objVal: {
              properties: {
                policers: {
                  mapVal: {objVal: {properties: {cir: {type: 'INT'}}}},
                },
              },
            },
          },
        },
      },
    }),
  );

const defaultProps = {
  cpeInterface: 'test_cpe',
};

beforeEach(() => {
  onUpdateMock.mockReset();
});

test('modifications trigger an update', async () => {
  const {getByText, getByDisplayValue} = render(
    <TestApp>
      <QoSInterfaceConfig {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Policing Classification for test_cpe')).toBeInTheDocument();
  expect(
    getByText(/Configure custom CIR and EIR for each Traffic Class/i),
  ).toBeInTheDocument();

  const input = getByDisplayValue(100);
  fireEvent.change(input, {target: {value: 200}});
  expect(onUpdateMock).toHaveBeenCalledWith({
    configField: 'cpeParams.policers.test_cpe',
    draftValue: {'0': {cir: 200}},
  });
});

test('deletion triggers an update', async () => {
  const {getByText} = render(
    <TestApp>
      <QoSInterfaceConfig {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Policing Classification for test_cpe')).toBeInTheDocument();
  expect(
    getByText(/Configure custom CIR and EIR for each Traffic Class/i),
  ).toBeInTheDocument();

  const btn = getByText('Delete');
  fireEvent.click(btn);
  expect(onUpdateMock).toHaveBeenCalledWith({
    configField: 'cpeParams.policers.test_cpe',
    draftValue: {},
  });
});
