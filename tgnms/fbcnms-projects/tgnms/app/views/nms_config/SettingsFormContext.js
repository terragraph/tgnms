/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';

import type {
  EnvMap,
  SettingDefinition,
  SettingsState,
} from '@fbcnms/tg-nms/shared/dto/Settings';

export type InputData = {|
  value: ?string,
  fallbackValue: ?string,
  onChange: (?string) => void,
  config: ?SettingDefinition,
  isOverridden: boolean,
|};

export type SettingsFormContext = {|
  getInput: (settingKey: string) => InputData,
  formState: EnvMap,
  settingsState: SettingsState,
|};

const defaultValue: $Shape<SettingsFormContext> = {
  getInput: () => ({}: $Shape<InputData>),
};

const context = React.createContext<SettingsFormContext>(defaultValue);

export function useSettingsFormContext() {
  return React.useContext(context);
}

export type ProviderProps = {|
  children: React.Node,
  ...SettingsFormContext,
|};

export function Provider({
  children,
  getInput,
  formState,
  settingsState,
}: ProviderProps) {
  return (
    <context.Provider value={{getInput, formState, settingsState}}>
      {children}
    </context.Provider>
  );
}
