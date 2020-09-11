/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigOptionSelector from '../ConfigOptionSelector';
import ConfigTaskGroup from '../ConfigTaskGroup';
import PopBgpRouting from './PopBgpRouting';
import PopStaticRouting from './PopStaticRouting';

export default function PopRouting() {
  return (
    <ConfigTaskGroup
      title="Upstream Routing"
      description="Required for POP nodes to connect to the upstream network for their default route.">
      <ConfigOptionSelector
        options={{
          none: {
            name: 'Unset',
            setConfigs: [
              {
                set: '0',
                configField: 'popParams.POP_BGP_ROUTING',
              },
              {
                set: '0',
                configField: 'popParams.POP_STATIC_ROUTING',
              },
            ],
          },
          static: {
            name: 'Static',
            description: 'Configure static default route',
            setConfigs: [
              {
                set: '0',
                configField: 'popParams.POP_BGP_ROUTING',
              },
              {
                set: '1',
                configField: 'popParams.POP_STATIC_ROUTING',
              },
            ],
            configGroup: <PopStaticRouting />,
          },
          bgp: {
            name: 'BGP',
            description: 'Configure Border Gateway Protocol (BGP) routing',
            setConfigs: [
              {
                set: '1',
                configField: 'popParams.POP_BGP_ROUTING',
              },
              {
                set: '0',
                configField: 'popParams.POP_STATIC_ROUTING',
              },
            ],
            configGroup: <PopBgpRouting />,
          },
        }}
      />
    </ConfigTaskGroup>
  );
}
