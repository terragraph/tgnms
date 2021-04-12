/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import DatabaseSettings from '@fbcnms/tg-nms/app/views/nms_config/DatabaseSettings';
import Grid from '@material-ui/core/Grid';
import SettingsForm from '@fbcnms/tg-nms/app/views/nms_config/SettingsForm';
import TroubleshootWarning from './TroubleshootWarning';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import useTroubleshootAutomation from '@fbcnms/tg-nms/app/hooks/useTroubleshootAutomation';

export default function TableLinkAvailability() {
  const attemptTroubleShootAutomation = useTroubleshootAutomation();

  const {updateFormState, formState} = useForm({
    initialState: {},
  });

  const onAttemptFix = React.useCallback(() => {
    const successMessage = 'Successfully updated db info';
    const settingsChange = {
      MYSQL_HOST: formState.MYSQL_HOST,
      MYSQL_DB: formState.MYSQL_DB,
      MYSQL_USER: formState.MYSQL_USER,
      MYSQL_PORT: formState.MYSQL_PORT,
      MYSQL_PASS: formState.MYSQL_PASS,
    };

    attemptTroubleShootAutomation({
      settingsChange,
      successMessage,
    });
  }, [attemptTroubleShootAutomation, formState]);

  return (
    <TroubleshootWarning
      isToolTip={true}
      title="MySQL DB Unavailable"
      modalContent={
        <Grid container spacing={3}>
          <Grid item container>
            <Grid item>
              If you were expecting availability, NMS may be unable to connect
              to the DB.
            </Grid>
            <Grid item>
              Ensure the DB is online and available, then ensure DB settings are
              correct.
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <SettingsForm hideTopBar={true} onUpdate={updateFormState}>
              <DatabaseSettings />
            </SettingsForm>
          </Grid>
        </Grid>
      }
      onAttemptFix={onAttemptFix}
    />
  );
}
