/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import CnConfig from './configTasks/CnConfig';
import ConfigTaskForm from './ConfigTaskForm';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import MenuItem from '@material-ui/core/MenuItem';
import ModalConfigGet from '@fbcnms/tg-nms/app/views/config/ModalConfigGet';
import PopKvstoreParams from './configTasks/PopKvstoreParams';
import PopRouting from './configTasks/PopRouting';
import QoSTrafficConfig from './configTasks/QoSTrafficConfig';
import RadioParams from './configTasks/RadioParams';
import SysParams from './configTasks/SysParams';
import TextField from '@material-ui/core/TextField';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {NodeTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {STEP_TARGET} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {getTopologyNodeList} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {makeStyles} from '@material-ui/styles';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useTutorialContext} from '@fbcnms/tg-nms/app/contexts/TutorialContext';

import type {NodeType} from '@fbcnms/tg-nms/shared/types/Topology';

const useModalStyles = makeStyles(() => ({
  root: {
    width: '60%',
    minWidth: 400,
  },
  advancedLink: {
    float: 'right',
  },
}));

export type Props = {
  open: boolean,
  modalTitle: string,
  onClose: () => void,
  onSubmit?: () => void,
  onAdvancedLinkClick?: () => void,
  node?: NodeType,
  onUpdate?: ({[string]: string}) => {},
};

export default function TaskBasedConfigModal(props: Props) {
  const {
    modalTitle,
    open,
    onClose,
    onSubmit,
    onAdvancedLinkClick,
    onUpdate,
  } = props;
  const {selectedElement, nodeMap, networkConfig} = useNetworkContext();
  const classes = useModalStyles();
  const node = props.node ?? nodeMap[selectedElement?.name || ''];
  const {nextStep} = useTutorialContext();
  const fullNodeConfigModalState = useModalState();

  React.useEffect(() => {
    if (open) {
      nextStep();
    }
  }, [open, nextStep]);

  const handleClose = React.useCallback(() => {
    nextStep();
    onClose();
  }, [onClose, nextStep]);

  const configGroup = [
    ...(node?.pop_node
      ? [
          {title: 'Upstream Routing', content: <PopRouting />},
          {title: 'Key-Value Store Parameters', content: <PopKvstoreParams />},
        ]
      : []),
    ...(node?.node_type === NodeTypeValueMap?.CN
      ? [{title: 'Client Node Config', content: <CnConfig />}]
      : []),
    {title: 'System Parameters', content: <SysParams />},
    {title: 'Radio Parameters', content: <RadioParams />},
    {title: 'QoS Traffic Config', content: <QoSTrafficConfig />},
  ];
  const {formState, handleInputChange} = useForm({
    initialState: {currentConfig: configGroup[0]},
  });

  const nodeConfigs = getTopologyNodeList(networkConfig, null);
  const nodeInfo =
    nodeConfigs.find(nodeConfig => nodeConfig.name === node?.name) || null;

  return (
    <MaterialModal
      className={`${classes.root} ${STEP_TARGET.CONFIG_MODAL}`}
      open={open}
      modalContent={
        <ConfigTaskForm
          nodeName={node?.name ?? ''}
          onClose={handleClose}
          onSubmit={onSubmit}
          editMode={FORM_CONFIG_MODES.NODE}
          showSubmitButton={true}
          nodeInfo={nodeInfo}
          onUpdate={onUpdate}>
          <>
            {formState.currentConfig.content}
            {nodeInfo && (
              <Grid container spacing={2} justifyContent="space-between">
                <Grid item xs={6}>
                  <Button
                    color="primary"
                    onClick={fullNodeConfigModalState.open}>
                    Show Full Configuration
                  </Button>
                  <ModalConfigGet
                    isOpen={fullNodeConfigModalState.isOpen}
                    onClose={fullNodeConfigModalState.close}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Button
                    color="primary"
                    className={classes.advancedLink}
                    onClick={onAdvancedLinkClick}>
                    Go to advanced configuration
                  </Button>
                </Grid>
              </Grid>
            )}
          </>
        </ConfigTaskForm>
      }
      modalTitle={
        <Grid container direction="row" spacing={0}>
          <Grid item xs={6}>
            {modalTitle}
          </Grid>
          <Grid item xs={6}>
            <TextField
              select
              value={formState.currentConfig.title}
              InputLabelProps={{shrink: true}}
              fullWidth
              onChange={handleInputChange(val => ({
                currentConfig:
                  configGroup.find(config => config.title === val) ?? null,
              }))}>
              {configGroup.map(group => (
                <MenuItem key={group.title} value={group.title}>
                  {group.title}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      }
    />
  );
}
