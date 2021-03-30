/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import TroubleshootWarning from './TroubleshootWarning';
import useTroubleshootAutomation from '../../hooks/useTroubleshootAutomation';
import {TopologyElementType} from '../../constants/NetworkConstants';
import {useNetworkContext} from '../../contexts/NetworkContext';

export default function FirmwareCrashAutomation() {
  const {selectedElement} = useNetworkContext();

  const attemptTroubleShootAutomation = useTroubleshootAutomation();

  const nodeName = React.useMemo(() => {
    if (selectedElement && selectedElement.type === TopologyElementType.NODE) {
      return selectedElement.name;
    }
    return '';
  }, [selectedElement]);

  const onAttemptFix = React.useCallback(() => {
    const successMessage = 'Successfully restarted node.';
    const apiCallData = {
      endpoint: 'rebootNode',
      data: {nodes: [nodeName], secondsToReboot: 5},
    };

    attemptTroubleShootAutomation({apiCallData, successMessage});
  }, [attemptTroubleShootAutomation, nodeName]);

  return (
    <TroubleshootWarning
      isToolTip={true}
      title="Node Firmware Crahsed"
      modalContent="Node firmware seems to have crashed. By clicking confirm, you will restart the node which will resolve most common problems."
      onAttemptFix={onAttemptFix}
    />
  );
}
