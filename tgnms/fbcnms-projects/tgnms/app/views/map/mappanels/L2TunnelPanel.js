/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ConfigTaskForm from '@fbcnms/tg-nms/app/components/taskBasedConfig/ConfigTaskForm';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import L2TunnelInputs from '@fbcnms/tg-nms/app/views/map/mappanels/L2TunnelInputs';
import React from 'react';
import Slide from '@material-ui/core/Slide';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {
  PANELS,
  PANEL_STATE,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {SlideProps} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';

import type {PanelStateControl} from '@fbcnms/tg-nms/app/features/map/usePanelControl';

export default function AddL2Tunnel({
  panelControl,
}: {
  panelControl: PanelStateControl,
}) {
  const {
    l2TunnelInitialParams,
    setSelectedTopologyPanel,
  } = useTopologyBuilderContext();

  const {setPanelState} = panelControl;

  const handleClose = React.useCallback(() => {
    setPanelState(PANELS.L2_TUNNEL, PANEL_STATE.HIDDEN);
    setSelectedTopologyPanel(null);
  }, [setPanelState, setSelectedTopologyPanel]);

  // If l2 tunnel params were passed in then we are in EDIT mode.
  let initialParams = null;
  if (l2TunnelInitialParams) {
    initialParams = l2TunnelInitialParams;
  }

  return (
    <Slide
      {...SlideProps}
      unmountOnExit
      in={!panelControl.getIsHidden(PANELS.L2_TUNNEL)}>
      <CustomAccordion
        title="Add L2 Tunnel"
        expanded={panelControl.getIsOpen(PANELS.L2_TUNNEL)}
        onChange={() => panelControl.toggleOpen(PANELS.L2_TUNNEL)}
        details={
          <div style={{width: '100%'}}>
            <ConfigTaskForm
              onClose={handleClose}
              editMode={FORM_CONFIG_MODES.MULTINODE}
              showSubmitButton={false}>
              <L2TunnelInputs
                key={initialParams?.nodeName}
                initialParams={initialParams}
                onClose={handleClose}
              />
            </ConfigTaskForm>
          </div>
        }
      />
    </Slide>
  );
}
