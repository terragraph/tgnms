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
import SettingInput from './SettingInput';

export default function DatabaseSettings() {
  return (
    <>
      <SettingInput label="MySQL Host" setting="MYSQL_HOST" />
      <SettingInput label="MySQL Database" setting="MYSQL_DB" />
      <SettingInput label="MySQL User" setting="MYSQL_USER" />
      <SettingInput label="MySQL Port" setting="MYSQL_PORT" />
      <SettingInput label="MySQL Password" setting="MYSQL_PASS" />
    </>
  );
}
