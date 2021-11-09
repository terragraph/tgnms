/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import type {
  ConfigParamsType,
  ConfigTaskContext,
} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

export function mockTaskConfigContext(
  overrides?: $Shape<ConfigTaskContext>,
): ConfigTaskContext {
  return {
    configData: [],
    configMetadata: {},
    onSubmit: jest.fn(),
    onUpdate: jest.fn(),
    onSetJson: jest.fn(),
    onCancel: jest.fn(),
    configOverrides: {},
    networkConfigOverride: {},
    configParams: ({}: $Shape<ConfigParamsType>),
    draftChanges: {},
    selectedValues: {
      nodeInfo: null,
      imageVersion: null,
      firmwareVersion: null,
      hardwareType: null,
    },
    editMode: FORM_CONFIG_MODES.NODE,
    ...(overrides ?? {}: $Shape<ConfigTaskContext>),
  };
}
