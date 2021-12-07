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
} from '@fbcnms/tg-nms/app/constants/ConfigConstants';

import type {ConfigDataLayerType} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import type {ControllerConfigType} from '@fbcnms/tg-nms/shared/types/Controller';
import type {NodeConfigStatusType} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import type {NodeConfigType} from '@fbcnms/tg-nms/shared/types/NodeConfig';

export type ConfigParamsType = {
  autoOverridesConfig: {[string]: NodeConfigType},
  hardwareBaseConfig: {[string]: NodeConfigType},
  networkOverridesConfig: NodeConfigType,
  nodeOverridesConfig: NodeConfigType,
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

type objValType = {properties: {[string]: ConfigMetaDataType}};

export type ConfigMetaDataType = {
  action: string,
  desc: string,
  required?: boolean,
  intVal?: {allowedRanges: Array<Array<number>>},
  strVal?: {allowedValues: Array<string>},
  floatVal?: {allowedRanges: Array<Array<number>>},
  readOnly?: boolean,
  deprecated?: boolean,
  mapVal?: {objVal?: objValType, mapVal?: {objVal?: objValType}},
  objVal?: objValType,
  defaultValue?: string,
  allowedValues?: Array<string>,
  type: $Keys<typeof DATA_TYPE_TO_INPUT_TYPE>,
};

export type SelectedValuesType = {
  nodeInfo: ?NodeConfigStatusType,
  imageVersion: ?string,
  firmwareVersion: ?string,
  hardwareType: ?string,
};

export type ConfigTaskContext = {|
  configData: Array<ConfigDataType>,
  configMetadata: $Shape<ConfigMetaDataType>,
  onSubmit: () => void,
  onUpdate: ({
    configField: string,
    draftValue: ?(string | number | boolean | {}),
  }) => void,
  onDelete: (path: Array<string>) => void,
  onSetJson: (?{}) => void,
  onCancel: () => void,
  configOverrides: {},
  networkConfigOverride: {},
  nodeOverridesConfig: {},
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
  nodeOverridesConfig: {},
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
  onDelete,
  onSetJson,
  configOverrides,
  networkConfigOverride,
  nodeOverridesConfig,
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
        nodeOverridesConfig,
        configParams,
        configMetadata,
        onUpdate,
        onDelete,
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
