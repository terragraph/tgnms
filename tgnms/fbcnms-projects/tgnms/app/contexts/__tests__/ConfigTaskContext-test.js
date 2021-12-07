/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {Provider as TaskConfigContextProvider} from '../ConfigTaskContext';
import {TestApp, renderWithRouter} from '@fbcnms/tg-nms/app/tests/testHelpers';

import {renderHook} from '@testing-library/react-hooks';
import {useConfigTaskContext} from '../ConfigTaskContext';

import type {
  ConfigDataType,
  ConfigMetaDataType,
  ConfigParamsType,
  SelectedValuesType,
} from '../ConfigTaskContext';

const defaultProps = {
  configData: [],
  configMetadata: {},
  configOverrides: {},
  networkConfigOverride: {},
  nodeOverridesConfig: {},
  onUpdate: jest.fn(),
  onDelete: jest.fn(),
  onSubmit: jest.fn(),
  configParams: {},
  draftChanges: {},
  selectedValues: {},
  editMode: FORM_CONFIG_MODES.NETWORK,
  onCancel: jest.fn(),
  onSetJson: jest.fn(),
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
  expect(result.current).toStrictEqual({
    configData: [],
    configMetadata: {},
    configOverrides: {},
    networkConfigOverride: {},
    nodeOverridesConfig: {},
    configParams: {},
    draftChanges: {},
    editMode: '',
    selectedValues: {},
  });
});

function Wrapper({
  children,
  configData,
  configMetadata,
  onUpdate,
  onDelete,
  configOverrides,
  networkConfigOverride,
  nodeOverridesConfig,
  configParams,
  draftChanges,
  selectedValues,
  editMode,
  onSubmit,
  onCancel,
  onSetJson,
}: {
  children: React.Node,
  configData: Array<ConfigDataType>,
  configMetadata: $Shape<ConfigMetaDataType>,
  onUpdate: ({
    configField: string,
    draftValue: ?(string | number | boolean | {}),
  }) => void,
  onDelete: () => void,
  configOverrides: {},
  networkConfigOverride: {},
  nodeOverridesConfig: {},
  configParams: ConfigParamsType,
  draftChanges: {[string]: string},
  selectedValues: SelectedValuesType,
  editMode: string,
  onSubmit: () => void,
  onCancel: () => void,
  onSetJson: () => void,
}) {
  return (
    <TaskConfigContextProvider
      configData={configData}
      configMetadata={configMetadata}
      onUpdate={onUpdate}
      onDelete={onDelete}
      configOverrides={configOverrides}
      networkConfigOverride={networkConfigOverride}
      nodeOverridesConfig={nodeOverridesConfig}
      configParams={configParams}
      draftChanges={draftChanges}
      selectedValues={selectedValues}
      editMode={editMode}
      onSubmit={onSubmit}
      onCancel={onCancel}
      onSetJson={onSetJson}>
      {children}
    </TaskConfigContextProvider>
  );
}
