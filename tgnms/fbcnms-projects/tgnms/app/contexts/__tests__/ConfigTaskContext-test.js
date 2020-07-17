/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import {Provider as TaskConfigContextProvider} from '../ConfigTaskContext';
import {TestApp, renderWithRouter} from '../../tests/testHelpers';
import {cleanup} from '@testing-library/react';
import {renderHook} from '@testing-library/react-hooks';
import {useConfigTaskContext} from '../ConfigTaskContext';

import type {ConfigDataType, ConfigMetaDataType} from '../ConfigTaskContext';

afterEach(cleanup);

const defaultProps = {
  configData: [],
  configMetadata: {},
  onUpdate: jest.fn(),
};

test('wrapper renders without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <Wrapper {...defaultProps}>test</Wrapper>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});

test('useContext provides expected values', () => {
  const {result} = renderHook(() => useConfigTaskContext());
  expect(result.current).toStrictEqual({configData: [], configMetadata: {}});
});

function Wrapper({
  children,
  configData,
  configMetadata,
  onUpdate,
}: {
  children: React.Node,
  configData: ?Array<ConfigDataType>,
  configMetadata: $Shape<ConfigMetaDataType>,
  onUpdate: ({
    configField: string,
    draftValue: string | number | boolean,
  }) => void,
}) {
  return (
    <TaskConfigContextProvider
      configData={configData}
      configMetadata={configMetadata}
      onUpdate={onUpdate}>
      {children}
    </TaskConfigContextProvider>
  );
}
