/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */
import * as React from 'react';
import {
  DATA_TYPE_TO_INPUT_TYPE,
  FORM_CONFIG_MODES,
} from '../constants/ConfigConstants';

import type {ConfigDataLayerType} from '../constants/ConfigConstants';
import type {ControllerConfigType} from '../../shared/types/Controller';
import type {NodeConfigStatusType} from '../helpers/ConfigHelpers';
import type {NodeConfigType} from '../../shared/types/NodeConfig';

export type ConfigParamsType = {
  autoOverridesConfig: {[string]: NodeConfigType},
  hardwareBaseConfig: {[string]: NodeConfigType},
  networkOverridesConfig: NodeConfigType,
  metadata: ConfigMetaDataType,
  nodeOverridesConfig: {[string]: NodeConfigType},
  controllerConfig: ControllerConfigType,
  aggregatorConfig: ControllerConfigType,
  baseConfigs: {[string]: NodeConfigType},
  hardwareBaseConfigs: {[string]: NodeConfigType},
  firmwareBaseConfigs: {[string]: NodeConfigType},
};

export type ConfigDataType = {|
  field: Array<string>,
  hasOverride: boolean,
  hasTopLeveloverride: boolean,
  layers: ConfigDataLayerType,
  metadata: ConfigMetaDataType,
|};

export type ConfigMetaDataType = {
  action: string,
  desc: string,
  required?: boolean,
  intVal?: {allowedRanges: Array<Array<number>>},
  strVal?: {allowedValues: Array<string>},
  floatVal?: {allowedRanges: Array<Array<number>>},
  readOnly?: boolean,
  deprecated?: boolean,
  mapVal?: {objVal: {properties: {[string]: ConfigMetaDataType}}},
  objVal?: {properties: {[string]: ConfigMetaDataType}},
  defaultValue?: string,
  allowedValues?: Array<string>,
  type: $Keys<typeof DATA_TYPE_TO_INPUT_TYPE>,
};

export type SelectedValuesType = {
  nodeInfo: ?NodeConfigStatusType,
  imageVersion: ?string,
  firmwareVersion: ?string,
  hardwareType: ?string,
  refreshConfig?: number,
};

export type ConfigTaskContext = {|
  configData: Array<ConfigDataType>,
  configMetadata: $Shape<ConfigMetaDataType>,
  onSubmit: () => void,
  onUpdate: ({
    configField: string,
    draftValue: ?(string | number | boolean | {}),
  }) => void,
  onSetJson: (?{}) => void,
  onCancel: () => void,
  configOverrides: {},
  networkConfigOverride: {},
  configParams: ConfigParamsType,
  draftChanges: {[string]: string},
  selectedValues: SelectedValuesType,
  editMode: $Values<typeof FORM_CONFIG_MODES>,
|};

const defaultValue: $Shape<ConfigTaskContext> = {
  configData: [],
  configMetadata: {},
  configOverrides: {},
  networkConfigOverride: {},
  configParams: {},
  draftChanges: {},
  selectedValues: {},
  editMode: '',
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
  onSetJson,
  configOverrides,
  networkConfigOverride,
  configParams,
  draftChanges,
  selectedValues,
  editMode,
  onSubmit,
  onCancel,
}: ProviderProps) {
  return (
    <context.Provider
      value={{
        configData,
        configOverrides,
        networkConfigOverride,
        configParams,
        configMetadata,
        onUpdate,
        onSetJson,
        draftChanges,
        selectedValues,
        editMode,
        onSubmit,
        onCancel,
      }}>
      {children}
    </context.Provider>
  );
}
