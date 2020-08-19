/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import MaterialReactSelect from '../common/MaterialReactSelect';
import React from 'react';
import useForm from '../../hooks/useForm';
import {NodeTypeValueMap} from '../../../shared/types/Topology';
import {makeStyles} from '@material-ui/styles';
import {useConfigTaskContext} from '../../contexts/ConfigTaskContext';
import {useNetworkContext} from '../../contexts/NetworkContext';

const useStyles = makeStyles(theme => ({
  button: {
    margin: '8px 4px',
    float: 'right',
  },
  select: {
    margin: theme.spacing(1),
  },
}));

export default function L2TunnelInputs() {
  const classes = useStyles();
  const {networkConfig} = useNetworkContext();
  const {topology} = networkConfig;
  const {onUpdate} = useConfigTaskContext();
  const onUpdateRef = React.useRef(onUpdate);

  const nodeMenuItems = topology.nodes.reduce(
    (result, node) => {
      if (node.pop_node && node.is_primary) {
        result.popNodes.push({
          label: node.name,
          value: node.name,
        });
      }
      if (node.node_type === NodeTypeValueMap.CN) {
        result.CNs.push({
          label: node.name,
          value: node.name,
        });
      }
      return result;
    },
    {popNodes: [], CNs: []},
  );

  const {formState, updateFormState} = useForm({
    initialState: {popNode: '', cn: ''},
  });

  const handlePopNodeNameChange = React.useCallback(
    target => {
      updateFormState({popNode: {label: target.value, value: target.value}});
    },
    [updateFormState],
  );

  const handleCnNameChange = React.useCallback(
    target => {
      updateFormState({cn: {label: target.value, value: target.value}});
    },
    [updateFormState],
  );

  React.useEffect(() => {
    //temporary config until L2 tunneling configs are defined
    if (formState.popNode !== '') {
      onUpdateRef.current({
        configField: 'popNode',
        draftValue: formState.popNode.value,
      });
    }
    if (formState.cn !== '') {
      onUpdateRef.current({
        configField: 'cn',
        draftValue: formState.cn.value,
      });
    }
  }, [onUpdateRef, formState]);

  return (
    <>
      <MaterialReactSelect
        className={classes.select}
        textFieldProps={{
          label: 'Pop Node *',
          InputLabelProps: {shrink: true},
        }}
        getOptionValue={option => option.label}
        options={nodeMenuItems.popNodes}
        required={true}
        onChange={handlePopNodeNameChange}
        value={formState.popNode}
      />

      <MaterialReactSelect
        className={classes.select}
        textFieldProps={{
          label: 'Client Node *',
          InputLabelProps: {shrink: true},
        }}
        getOptionValue={option => option.label}
        options={nodeMenuItems.CNs}
        required={true}
        onChange={handleCnNameChange}
        value={formState.cn}
      />
    </>
  );
}
