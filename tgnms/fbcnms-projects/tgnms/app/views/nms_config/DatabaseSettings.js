/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
