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

export default function LinkOffline() {
  const {linkMap, selectedElement} = useNetworkContext();

  const attemptTroubleShootAutomation = useTroubleshootAutomation();

  const nodeNames = React.useMemo(() => {
    if (selectedElement && selectedElement?.type === TopologyElementType.LINK) {
      const link = linkMap[selectedElement.name];
      return [link.a_node_name, link.z_node_name];
    }
    return [];
  }, [selectedElement, linkMap]);

  const onAttemptFix = React.useCallback(() => {
    const successMessage = 'Successfully restarted nodes.';
    const apiCallData = {
      endpoint: 'rebootNode',
      data: {nodes: nodeNames, secondsToReboot: 5},
    };

    attemptTroubleShootAutomation({apiCallData, successMessage});
  }, [attemptTroubleShootAutomation, nodeNames]);

  return (
    <TroubleshootWarning
      isToolTip={true}
      title="Link Offline"
      modalContent="Link is offline even though nodes are both online. By clicking confirm, you will restart both nodes creating this link. This will temporarily bring nodes down, but then bring link online in most cases."
      onAttemptFix={onAttemptFix}
    />
  );
}
