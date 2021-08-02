/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import Button from '@material-ui/core/Button';
import InputLabel from '@material-ui/core/InputLabel';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import MaterialReactSelect from '@fbcnms/tg-nms/app/components/common/MaterialReactSelect';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import {apiServiceRequest} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {makeStyles} from '@material-ui/styles';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

const useStyles = makeStyles(theme => ({
  root: {
    minWidth: 720,
  },
  button: {
    margin: theme.spacing(),
  },
}));

type Props = {
  isOpen: boolean,
  onClose: Function,
};

export default function ModalClearNodeAutoConfig(props: Props) {
  const classes = useStyles();
  const snackbars = useSnackbars();
  const {isOpen, onClose} = props;
  const {networkName, nodeMap} = useNetworkContext();
  const [nodePath, setNodePath] = React.useState('');
  const [nodesSelected, setNodesSelected] = React.useState([]);
  const nodes = Object.keys(nodeMap);

  const nodeOptions =
    nodes?.map(nodeName => {
      return {
        label: nodeName,
        value: nodeName,
      };
    }) ?? [];
  nodeOptions.unshift({
    label: 'All Nodes',
    value: '',
  });

  const handleSubmit = () => {
    const data = {
      nodeNames: nodesSelected.map(node => node.value),
      configPaths: [nodePath],
    };

    apiServiceRequest(networkName, 'clearAutoNodeOverridesConfig', data)
      .then(() => {
        snackbars.success('You have sucessfully cleared the Auto Configs');
        onClose();
      })
      .catch(error => {
        snackbars.error(
          `Your clear configuration attempt failed with the following message: ${error}.`,
        );
      });
  };

  return (
    <MaterialModal
      className={classes.root}
      open={isOpen}
      onClose={onClose}
      modalTitle="Clear Node Auto Configurations"
      modalContent={
        <>
          <InputLabel color="textSecondary" htmlFor="nodesSelected">
            Nodes:
          </InputLabel>
          <MaterialReactSelect
            id="nodesSelected"
            key="nodesSelected"
            defaultOptions
            cacheOptions={false}
            data-testid="toggle-node-menu"
            getOptionValue={option => option.label}
            options={nodeOptions}
            isMulti
            onChange={value => {
              setNodesSelected(value);
            }}
            value={nodesSelected}
          />
          <TextField
            id="nodePath"
            key="nodePath"
            label="Config Path"
            margin="dense"
            fullWidth
            onChange={ev => {
              const v = ev.target.value;
              setNodePath(v);
            }}
            value={nodePath}
          />
        </>
      }
      modalActions={
        <>
          <Button
            className={classes.button}
            disabled={!nodePath || !nodesSelected}
            onClick={handleSubmit}
            variant="outlined">
            Submit
          </Button>
          <Button
            className={classes.button}
            variant="outlined"
            onClick={onClose}>
            Close
          </Button>
        </>
      }
    />
  );
}
