/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import TroubleshootWarning from './TroubleshootWarning';
import useTroubleshootAutomation from '../../hooks/useTroubleshootAutomation';

export default function PrometheusOfflineAutomation() {
  const attemptTroubleShootAutomation = useTroubleshootAutomation();

  const onAttemptFix = React.useCallback(() => {
    const successMessage = 'Successfully changed prometheus URL.';
    const settingsChange = {PROMETHEUS: 'http://prometheus:9090'};

    attemptTroubleShootAutomation({settingsChange, successMessage});
  }, [attemptTroubleShootAutomation]);

  return (
    <TroubleshootWarning
      isToolTip={true}
      title="Prometheus Offline"
      modalContent="Prometheus is offline, by clicking confirm you will set prometheus url to the default in an attempt to connect with prometheus."
      onAttemptFix={onAttemptFix}
    />
  );
}
