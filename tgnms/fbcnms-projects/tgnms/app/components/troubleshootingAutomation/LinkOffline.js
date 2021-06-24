/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import TroubleshootWarning from './TroubleshootWarning';
import useTroubleshootAutomation from '@fbcnms/tg-nms/app/hooks/useTroubleshootAutomation';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

export default function LinkOffline() {
  const {linkMap, selectedElement} = useNetworkContext();

  const attemptTroubleShootAutomation = useTroubleshootAutomation();

  const nodeNames = React.useMemo(() => {
    if (selectedElement && selectedElement?.type === TOPOLOGY_ELEMENT.LINK) {
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
      modalContent={
        <Grid container spacing={3}>
          <Grid item container>
            <Grid item>Link is offline even though nodes are both online.</Grid>
            <Grid item>
              This could be caused by something blocking the path of the link.
            </Grid>
            <Grid item>
              By clicking confirm, you will restart both nodes creating this
              link.
            </Grid>
            <Grid item>
              This will temporarily bring nodes down, but then attempt to bring
              link back online.
            </Grid>
          </Grid>
        </Grid>
      }
      onAttemptFix={onAttemptFix}
    />
  );
}
