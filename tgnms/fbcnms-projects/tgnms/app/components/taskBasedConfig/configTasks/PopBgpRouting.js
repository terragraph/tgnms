/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigTaskEnabled from '../ConfigTaskEnabled';
import ConfigTaskInput from '../ConfigTaskInput';

export default function PopBgpRouting() {
  return (
    <>
      <ConfigTaskEnabled
        label="POP VPP Address"
        configField="popParams.VPP_ADDR"
        enabledConfigField="envParams.OPENR_USE_FIB_VPP"
        configLevel="network"
      />
      <ConfigTaskInput label="POP Address" configField="popParams.POP_ADDR" />
      <ConfigTaskInput
        label="POP Interface"
        configField="popParams.POP_IFACE"
      />
      <ConfigTaskInput label="Local ASN" configField="bgpParams.localAsn" />
      <ConfigTaskInput
        label="Neightbor ASN"
        configField="bgpParams.neighbors.0.asn"
      />
      <ConfigTaskInput
        label="Neighbor IPv6 Address"
        configField="bgpParams.neighbors.0.ipv6"
      />
    </>
  );
}
