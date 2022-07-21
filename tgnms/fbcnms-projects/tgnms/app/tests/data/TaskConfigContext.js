/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
