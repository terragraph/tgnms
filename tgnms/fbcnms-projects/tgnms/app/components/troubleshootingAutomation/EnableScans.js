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
import ConfigTaskForm from '../taskBasedConfig/ConfigTaskForm';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import KafkaEndpoint from '../taskBasedConfig/configTasks/KafkaEndpoint';
import TextField from '@material-ui/core/TextField';
import TroubleshootWarning from './TroubleshootWarning';
import ZmqUrl from '../taskBasedConfig/configTasks/ZmqUrl';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import useTroubleshootAutomation from '@fbcnms/tg-nms/app/hooks/useTroubleshootAutomation';
import {
  FORM_CONFIG_MODES,
  SWARM_URLS,
} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(() => ({
  label: {
    color: 'black',
  },
}));

export default function EnableScans() {
  const attemptTroubleShootAutomation = useTroubleshootAutomation();
  const classes = useStyles();

  const {handleInputChange, updateFormState, formState} = useForm({
    initialState: {
      scan: SWARM_URLS.SCANSERVICE_HOST,
      zmq: '',
      kafka: '',
    },
  });
  const onAttemptFix = React.useCallback(() => {
    const successMessage = 'Successfully enabled scan service';
    const settingsChange = {
      SCANSERVICE_ENABLED: 'true',
      SCANSERVICE_HOST: formState.scan,
    };
    const configChange = {
      mode: FORM_CONFIG_MODES.NETWORK,
      drafts: {},
    };
    if (formState.kafka) {
      configChange.drafts = {
        ...configChange.drafts,
        'statsAgentParams.endpointParams.kafkaParams.config.brokerEndpointList':
          formState.kafka,
        'statsAgentParams.endpointParams.kafkaParams.enabled': true,
      };
    }
    if (formState.zmq) {
      configChange.drafts = {
        ...configChange.drafts,
        'statsAgentParams.sources.controller.zmq_url': formState.zmq,
      };
    }

    attemptTroubleShootAutomation({
      settingsChange,
      configChange,
      successMessage,
    });
  }, [attemptTroubleShootAutomation, formState]);

  return (
    <TroubleshootWarning
      isToolTip={true}
      title="Scan Service Unavailable"
      modalContent={
        <ConfigTaskForm editMode={FORM_CONFIG_MODES.NETWORK}>
          <Grid container spacing={3}>
            <Grid item container>
              <Grid item>
                If you were expecting to see scans, Scan Service might be
                unavailable.
              </Grid>
              <Grid item>
                An online scan container, and ZMQ and Kafka URLs are required.
              </Grid>
              <Grid item>
                Please make sure the correct URLs are displayed below and click
                submit to change these settings.
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <FormLabel className={classes.label}>Scan Service URL</FormLabel>
              <TextField
                fullWidth
                value={formState.scan}
                onChange={handleInputChange(val => ({scan: val}))}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <ZmqUrl onChange={val => updateFormState({zmq: val})} />
            </Grid>
            <Grid item xs={12}>
              <KafkaEndpoint onChange={val => updateFormState({kafka: val})} />
            </Grid>
          </Grid>
        </ConfigTaskForm>
      }
      onAttemptFix={onAttemptFix}
    />
  );
}
