/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Collapse from '@material-ui/core/Collapse';
import ConfigTaskInput from './ConfigTaskInput';
import Grid from '@material-ui/core/Grid';
import {get} from 'lodash';
import {useConfigTaskContext} from '../../contexts/ConfigTaskContext';

const NETWORK_OVERRIDE_LAYER = 'network';

export default function ConfigTaskEnabled({
  label,
  configField,
  enabledConfigField,
  configLevel,
}: {
  label: string,
  configField: string,
  configLevel?: string,
  enabledConfigField?: string,
}) {
  const {configOverrides, networkConfigOverride} = useConfigTaskContext();
  const overrides =
    configLevel === NETWORK_OVERRIDE_LAYER
      ? networkConfigOverride
      : configOverrides;
  const value = get(overrides, enabledConfigField?.split('.'));

  return (
    <Grid item>
      <Collapse in={value && value != '0'} data-testid={'task-collapse'}>
        <ConfigTaskInput
          key={configField}
          label={label}
          configField={configField}
        />
      </Collapse>
    </Grid>
  );
}
