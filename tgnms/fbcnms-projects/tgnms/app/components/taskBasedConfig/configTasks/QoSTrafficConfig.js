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
import ConfigTaskGroup from '../ConfigTaskGroup';
import ConfigTaskInput from '../ConfigTaskInput';
import ConfigTaskMapInput from '../ConfigTaskMapInput';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import QoSInterfaceConfig from './QoSInterfaceConfig';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const CPE_INTERFACES_FIELD = 'cpeParams.cpeInterfaces';

export default function QoSTrafficConfig() {
  const {draftChanges} = useConfigTaskContext();
  const currentCpeInterfaces: Array<string> = React.useMemo(
    () =>
      // $FlowIgnore
      draftChanges?.cpeParams?.cpeInterfaces.split(',') ?? [],
    [draftChanges],
  );

  return (
    isFeatureEnabled('QOS_CONFIG') && (
      <ConfigTaskGroup title="QoS Config">
        <ConfigTaskInput
          label="CPE Interfaces"
          configField={CPE_INTERFACES_FIELD}
        />
        {currentCpeInterfaces.map(cpeInterface => (
          <QoSInterfaceConfig cpeInterface={cpeInterface} />
        ))}
        <ConfigTaskMapInput
          label="DSCP Scheduling Priority"
          configField="qosConfig.dscpEntries"
          buttonText="Add Custom DSCP Mapping"
          customKeyLabel="DSCP Index"
        />
        <Grid item container>
          <FormLabel>
            <Grid item>Default overwritten values are at indicies:</Grid>
            <Grid item>10, 14, 18, 20, 22, 26, 28, 30, 34, 36, 38</Grid>
            <Grid item>
              For more information visit the Terragraph Operation Docs
            </Grid>
          </FormLabel>
        </Grid>
      </ConfigTaskGroup>
    )
  );
}
