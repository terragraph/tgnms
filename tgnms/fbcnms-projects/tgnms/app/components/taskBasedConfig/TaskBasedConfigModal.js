/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import CnConfig from './configTasks/CnConfig';
import ConfigTaskForm from './ConfigTaskForm';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import PopKvstoreParams from './configTasks/PopKvstoreParams';
import PopRouting from './configTasks/PopRouting';
import RadioParams from './configTasks/RadioParams';
import React from 'react';
import SysParams from './configTasks/SysParams';
import TextField from '@material-ui/core/TextField';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {NodeTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {makeStyles} from '@material-ui/styles';

const useModalStyles = makeStyles(theme => ({
  root: {
    width: '60%',
    minWidth: 400,
  },
  advancedLink: {
    paddingTop: theme.spacing(2),
    float: 'right',
  },
}));

export type Props = {
  open: boolean,
  modalTitle: string,
  onClose: () => void,
  onAdvancedLinkClick?: () => void,
};

export default function TaskBasedConfigModal(props: Props) {
  const {modalTitle, open, onClose, onAdvancedLinkClick} = props;
  const {selectedElement, nodeMap} = React.useContext(NetworkContext);
  const classes = useModalStyles();
  const node = nodeMap[selectedElement?.name || ''];

  const configGroup = [
    ...(node?.is_primary && node?.pop_node
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
  ];
  const {formState, handleInputChange} = useForm({
    initialState: {currentConfig: configGroup[0]},
  });

  return (
    <MaterialModal
      className={classes.root}
      open={open}
      modalContent={
        <>
          <ConfigTaskForm
            nodeName={selectedElement?.name}
            onClose={onClose}
            editMode={FORM_CONFIG_MODES.NODE}
            showSubmitButton={true}
            advancedLink={
              <Button
                color="primary"
                className={classes.advancedLink}
                onClick={onAdvancedLinkClick}>
                Go to advanced configuration
              </Button>
            }>
            {formState.currentConfig.content}
          </ConfigTaskForm>
        </>
      }
      modalTitle={
        <Grid container direction="row" spacing={0}>
          <Grid item xs={4}>
            {modalTitle}
          </Grid>
          <Grid item xs={8}>
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
