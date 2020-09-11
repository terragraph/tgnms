/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigTaskEnabled from '../ConfigTaskEnabled';
import ConfigTaskInput from '../ConfigTaskInput';

export default function PopStaticRouting() {
  return (
    <>
      <ConfigTaskEnabled
        label="POP VPP Address"
        configField="popParams.VPP_ADDR"
        enabledConfigField="envParams.OPENR_USE_FIB_VPP"
        configLevel="network"
      />
      <ConfigTaskInput label="GW Address" configField="popParams.GW_ADDR" />
      <ConfigTaskInput label="POP Address" configField="popParams.POP_ADDR" />
      <ConfigTaskInput
        label="POP Interface"
        configField="popParams.POP_IFACE"
      />
    </>
  );
}
