/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */
import * as React from 'react';

import type {NodeConfigType} from '../../shared/types/NodeConfig';

const dataTypeToInputType = {
  INTEGER: 'number',
  STRING: 'text',
  BOOLEAN: 'checkbox',
};

export type ConfigParamsType = {
  autoOverridesConfig: {},
  hardwareBaseConfig: {},
  networkOverridesConfig: NodeConfigType,
  metadata: ConfigMetaDataType,
  nodeOverridesConfig: {[string]: NodeConfigType},
};

export type ConfigDataType = {
  field: Array<string>,
  hasOverride: boolean,
  hasTopLeveloverride: boolean,
  layers: Array<{id: string, value: string | number | boolean}>,
  metadata: ConfigMetaDataType,
};

export type ConfigMetaDataType = {
  action: string,
  desc: string,
  intVal?: {allowedRanges: Array<Array<number>>},
  strVal?: {allowedValues: Array<string>},
  mapVal?: {objVal: {properties: {[string]: ConfigMetaDataType}}},
  objVal?: {properties: {[string]: ConfigMetaDataType}},
  allowedValues?: Array<string>,
  type: $Keys<typeof dataTypeToInputType>,
};

export type ConfigTaskContext = {|
  configData: ?Array<ConfigDataType>,
  configMetadata: $Shape<ConfigMetaDataType>,
  onUpdate: ({
    configField: string,
    draftValue: string | number | boolean,
  }) => void,
  configOverrides: {},
  networkConfigOverride: {},
|};

const defaultValue: $Shape<ConfigTaskContext> = {
  configData: [],
  configMetadata: {},
  configOverrides: {},
  networkConfigOverride: {},
};

const context = React.createContext<ConfigTaskContext>(defaultValue);

export function useConfigTaskContext() {
  return React.useContext(context);
}

export type ProviderProps = {|
  children: React.Node,
  ...ConfigTaskContext,
|};

export function Provider({
  children,
  configData,
  configMetadata,
  onUpdate,
  configOverrides,
  networkConfigOverride,
}: ProviderProps) {
  return (
    <context.Provider
      value={{
        configData,
        configOverrides,
        networkConfigOverride,
        configMetadata,
        onUpdate,
      }}>
      {children}
    </context.Provider>
  );
}
