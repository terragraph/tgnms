/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import TroubleshootWarning from './TroubleshootWarning';
import useTroubleshootAutomation from '../../hooks/useTroubleshootAutomation';

export default function EnableNetworkTestAutomation() {
  const attemptTroubleShootAutomation = useTroubleshootAutomation();

  const onAttemptFix = React.useCallback(() => {
    const successMessage = 'Successfully enabled network test';
    const settingsChange = {
      NETWORKTEST_ENABLED: 'true',
      NETWORKTEST_HOST: 'http://network_test:8080',
    };

    attemptTroubleShootAutomation({settingsChange, successMessage});
  }, [attemptTroubleShootAutomation]);

  return (
    <TroubleshootWarning
      isToolTip={true}
      title="Networktest Unavailable"
      modalContent="Network test is currently unavailable. By clicking confirm, you will enable network test, and set required configs for networktest to run successfully."
      onAttemptFix={onAttemptFix}
    />
  );
}
