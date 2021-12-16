/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Box from '@material-ui/core/Box';
import CnConfig from '@fbcnms/tg-nms/app/components/taskBasedConfig/configTasks/CnConfig';
import FluentdEndpoints from '@fbcnms/tg-nms/app/components/taskBasedConfig/configTasks/FluentdEndpoints';
import Grid from '@material-ui/core/Grid';
import KafkaParams from '@fbcnms/tg-nms/app/components/taskBasedConfig/configTasks/KafkaParams';
import NetworkEnvParams from '@fbcnms/tg-nms/app/components/taskBasedConfig/configTasks/NetworkEnvParams';
import NetworkRouting from '@fbcnms/tg-nms/app/components/taskBasedConfig/configTasks/NetworkRouting';
import NetworkSnmp from '@fbcnms/tg-nms/app/components/taskBasedConfig/configTasks/NetworkSnmp';
import PopKvstoreParams from '@fbcnms/tg-nms/app/components/taskBasedConfig/configTasks/PopKvstoreParams';
import PopRouting from '@fbcnms/tg-nms/app/components/taskBasedConfig/configTasks/PopRouting';
import QoSTrafficConfig from '@fbcnms/tg-nms/app/components/taskBasedConfig/configTasks/QoSTrafficConfig';
import RadioParams from '@fbcnms/tg-nms/app/components/taskBasedConfig/configTasks/RadioParams';
import StatsAgentParams from '@fbcnms/tg-nms/app/components/taskBasedConfig/configTasks/StatsAgentParams';
import SysParams from '@fbcnms/tg-nms/app/components/taskBasedConfig/configTasks/SysParams';
import Typography from '@material-ui/core/Typography';
import {
  CONFIG_FORM_MODE,
  CONFIG_FORM_MODE_DESCRIPTION,
  FORM_CONFIG_MODES,
} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {makeStyles} from '@material-ui/styles';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const useStyles = makeStyles(_theme => ({
  root: {
    overflow: 'scroll',
    overflowX: 'hidden',
  },
}));

export default function ConfigQuickSettingsForm() {
  const {editMode, selectedValues} = useConfigTaskContext();
  const classes = useStyles();

  let formMode = CONFIG_FORM_MODE.NETWORK;
  if (editMode === FORM_CONFIG_MODES.NODE) {
    if (selectedValues.nodeInfo?.isCn) {
      formMode = CONFIG_FORM_MODE.CN;
    } else if (selectedValues.nodeInfo?.isPop) {
      formMode = CONFIG_FORM_MODE.POP;
    } else {
      formMode = CONFIG_FORM_MODE.NODE;
    }
  }

  const {title, description} = CONFIG_FORM_MODE_DESCRIPTION[formMode];

  return (
    <div className={classes.root}>
      <Grid item container direction="column" spacing={4}>
        <Grid item xs={12}>
          <Box px={1} pt={2}>
            {title && <Typography variant="h6">{title}</Typography>}
            {description && (
              <Typography variant="body2" color="textSecondary">
                {description}
              </Typography>
            )}
          </Box>
        </Grid>
        <Grid
          item
          xs={12}
          container
          spacing={2}
          direction="column"
          wrap="nowrap">
          {formMode === 'NETWORK' && (
            <>
              <SysParams />
              <NetworkRouting />
              <NetworkEnvParams />
              <FluentdEndpoints />
              <NetworkSnmp />
              <KafkaParams />
              <StatsAgentParams />
            </>
          )}
          {formMode === 'POP' && (
            <>
              <PopRouting />
              <PopKvstoreParams />
              <SysParams />
            </>
          )}
          {formMode === 'CN' && (
            <>
              <CnConfig />
              <SysParams />
            </>
          )}
          {formMode === 'NODE' && (
            <>
              <SysParams />
            </>
          )}
          <QoSTrafficConfig />
          <RadioParams />
        </Grid>
      </Grid>
    </div>
  );
}
