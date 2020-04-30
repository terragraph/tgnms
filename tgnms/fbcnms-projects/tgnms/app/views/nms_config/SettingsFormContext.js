/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */
import * as React from 'react';

import type {
  EnvMap,
  SettingDefinition,
  SettingsState,
} from '../../../shared/dto/Settings';

export type InputData = {|
  value: ?string,
  onChange: string => void,
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
