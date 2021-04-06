/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigTaskForm from '../taskBasedConfig/ConfigTaskForm';
import Grid from '@material-ui/core/Grid';
import PopKvstoreParams from '../taskBasedConfig/configTasks/PopKvstoreParams';
import PopRouting from '../taskBasedConfig/configTasks/PopRouting';
import SysParams from '../taskBasedConfig/configTasks/SysParams';
import TroubleshootWarning from './TroubleshootWarning';
import Typography from '@material-ui/core/Typography';
import useForm from '../../hooks/useForm';
import useTroubleshootAutomation from '../../hooks/useTroubleshootAutomation';
import {FORM_CONFIG_MODES} from '../../constants/ConfigConstants';
import {useNetworkContext} from '../../contexts/NetworkContext';

export default function PopOffline() {
  const attemptTroubleShootAutomation = useTroubleshootAutomation();
  const {selectedElement} = useNetworkContext();
  const nodeName = selectedElement?.name || '';

  const {updateFormState, formState, setFormState} = useForm({
    initialState: {},
  });

  const handleClose = React.useCallback(() => {
    setFormState({});
  }, [setFormState]);

  const onAttemptFix = React.useCallback(() => {
    const successMessage = 'Successfully changed pop node config';
    const configChange = {
      mode: FORM_CONFIG_MODES.NODE,
      drafts: {[nodeName]: formState},
    };
    if (Object.keys(formState).length > 0) {
      attemptTroubleShootAutomation({
        configChange,
        successMessage,
      });
    }
  }, [attemptTroubleShootAutomation, formState, nodeName]);

  return (
    <TroubleshootWarning
      isToolTip={true}
      title="PoP Node Offline"
      onClose={handleClose}
      modalContent={
        <ConfigTaskForm
          nodeName={nodeName}
          editMode={FORM_CONFIG_MODES.NODE}
          onUpdate={updateFormState}>
          <Grid container direction="column" spacing={3}>
            <Grid item container spacing={1}>
              <Grid item>
                <Typography>
                  First, ensure the MAC addresses for the Pop node are correct.
                </Typography>
              </Grid>
              <Grid item>
                <Typography>
                  If this is the first PoP node, it must be configured manually
                  since connectivity to E2E controller has not been established
                  yet.
                </Typography>
              </Grid>
              <Grid item>
                <Typography>
                  Ensure managedConfig is set to true and the config fields
                  below are correct.
                </Typography>
              </Grid>
              <Grid item>
                <Typography>
                  Next ensure the config on the node is the same as the JSON
                  config in the NMS.
                </Typography>
              </Grid>
              <Grid item>
                <Typography>
                  Finally, make sure the prefixAllocParams in the config
                  controller tab is the same as the e2e network prefix in the
                  POP config.
                </Typography>
              </Grid>
            </Grid>
            <Grid item>
              <PopRouting />
              <PopKvstoreParams />
              <SysParams />
            </Grid>
          </Grid>
        </ConfigTaskForm>
      }
      onAttemptFix={onAttemptFix}
    />
  );
}
