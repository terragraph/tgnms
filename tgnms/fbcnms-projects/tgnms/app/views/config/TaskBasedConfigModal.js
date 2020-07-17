/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ConfigTaskForm from './ConfigTaskForm';
import ConfigTaskGroup from './ConfigTaskGroup';
import ConfigTaskInput from './ConfigTaskInput';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '../../components/common/MaterialModal';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkContext from '../../contexts/NetworkContext';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import {NodeTypeValueMap} from '../../../shared/types/Topology';
import {configGroups} from '../../constants/ConfigConstants';
import {makeStyles} from '@material-ui/styles';
import {useForm} from '@fbcnms/ui/hooks';

const useModalStyles = makeStyles(theme => ({
  root: {
    width: '60%',
    minWidth: 400,
  },

  selector: {
    marginTop: theme.spacing(1),
  },
}));

export type Props = {
  open: boolean,
  modalTitle: string,
  onClose: () => void,
};

export default function TaskBasedConfigModal(props: Props) {
  const {modalTitle, open, onClose} = props;
  const {selectedElement, nodeMap} = React.useContext(NetworkContext);
  const classes = useModalStyles();
  const node = nodeMap[selectedElement?.name || ''];

  const configGroup = [
    ...(node?.is_primary && node?.pop_node ? configGroups.POP : []),
    ...(node?.node_type === NodeTypeValueMap?.CN ? configGroups.CN : []),
    ...configGroups.Node,
  ];
  const {formState, handleInputChange} = useForm({
    initialState: configGroup[0],
  });

  return (
    <MaterialModal
      className={classes.root}
      open={open}
      modalContent={
        <ConfigTaskForm
          nodeName={selectedElement?.name || null}
          onClose={onClose}>
          <ConfigTaskGroup>
            {formState.inputs.map(input => (
              <ConfigTaskInput
                key={input.configField}
                label={input.label}
                configField={input.configField}
              />
            ))}
          </ConfigTaskGroup>
        </ConfigTaskForm>
      }
      modalTitle={
        <Grid container direction="row" spacing={0}>
          <Grid item xs={4}>
            {modalTitle}
          </Grid>
          <Grid item xs={8}>
            <TextField
              className={classes.selector}
              select
              value={formState.title}
              InputLabelProps={{shrink: true}}
              fullWidth
              onChange={handleInputChange(
                val => configGroup.find(config => config.title === val) ?? {},
              )}>
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
