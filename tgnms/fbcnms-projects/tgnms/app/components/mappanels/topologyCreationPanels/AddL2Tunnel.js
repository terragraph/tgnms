/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ConfigTaskForm from '../../../views/config/ConfigTaskForm';
import CustomAccordion from '../../common/CustomAccordion';
import L2TunnelInputs from './L2TunnelInputs';
import React from 'react';
import {formConfigModes} from '../../../constants/ConfigConstants';
import {withForwardRef} from '@fbcnms/ui/components/ForwardRef';

import type {ForwardRef} from '@fbcnms/ui/components/ForwardRef';

type Props = {
  expanded: boolean,
  onPanelChange: () => any,
  onClose: () => any,
} & ForwardRef;

const AddL2Tunnel = withForwardRef((props: Props) => {
  const {expanded, onPanelChange, onClose, fwdRef} = props;

  return (
    <CustomAccordion
      ref={fwdRef}
      title="Add L2 Tunnel"
      details={
        <div style={{width: '100%'}}>
          <ConfigTaskForm onClose={onClose} mode={formConfigModes.MultiNode}>
            <L2TunnelInputs />
          </ConfigTaskForm>
        </div>
      }
      expanded={expanded}
      onChange={onPanelChange}
    />
  );
});

export default AddL2Tunnel;
