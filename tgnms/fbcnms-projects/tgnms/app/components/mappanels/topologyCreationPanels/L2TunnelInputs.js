/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import MaterialReactSelect from '../../common/MaterialReactSelect';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import useForm from '../../../hooks/useForm';
import {useConfigTaskContext} from '../../../contexts/ConfigTaskContext';
import {useNetworkContext} from '../../../contexts/NetworkContext';

const TUNNEL_TYPES = {
  gre: {label: 'GRE', value: 'GRE_L2'},
  srv6: {label: 'SRV6', value: 'SRV6'},
  vxlan: {label: 'VXLAN', value: 'VXLAN'},
};

const TUNNEL_DEST = {
  node: {label: 'Node', value: 'node'},
  ip: {label: 'External IP Address', value: 'ip'},
};

export default function L2TunnelInputs() {
  const {networkConfig} = useNetworkContext();
  const {topology} = networkConfig;
  const {onUpdate} = useConfigTaskContext();
  const onUpdateRef = React.useRef(onUpdate);

  const nodeMenuItems = topology.nodes.reduce((result, node) => {
    result.push({
      label: node.name,
      value: node.name,
    });
    return result;
  }, []);

  const {formState, updateFormState, handleInputChange} = useForm({
    initialState: {
      enabled: true,
      node1: '',
      node2: '',
      type: TUNNEL_TYPES.gre,
      vlanId: '',
      tunnelDest: TUNNEL_DEST.node,
      ipAddress: '',
    },
  });

  const handleTypeChange = React.useCallback(
    target => {
      updateFormState({type: {label: target.label, value: target.value}});
    },
    [updateFormState],
  );

  const handleTunnelDestChange = React.useCallback(
    target => {
      updateFormState({tunnelDest: {label: target.label, value: target.value}});
    },
    [updateFormState],
  );

  const handleNode1NameChange = React.useCallback(
    target => {
      updateFormState({node1: {label: target.value, value: target.value}});
    },
    [updateFormState],
  );

  const handleNode2NameChange = React.useCallback(
    target => {
      updateFormState({node2: {label: target.value, value: target.value}});
    },
    [updateFormState],
  );

  const handleEnableChange = React.useCallback(
    e => updateFormState({enabled: e.target.checked}),
    [updateFormState],
  );

  React.useEffect(() => {
    if (
      formState.tunnelDest.label === TUNNEL_DEST.node.label &&
      formState.node1 !== '' &&
      formState.node2 !== ''
    ) {
      onUpdateRef.current({
        configField: formState.node1.value,
        draftValue: {
          tunnelConfig: {
            [formState.node2.value]: {
              enabled: formState.enabled,
              dstNodeName: formState.node2.value,
              tunnelType: formState.type.value,
              tunnelParams: {vlanId: formState.vlanId},
            },
          },
        },
      });
      onUpdateRef.current({
        configField: formState.node2.value,
        draftValue: {
          tunnelConfig: {
            [formState.node1.value]: {
              enabled: formState.enabled,
              dstNodeName: formState.node1.value,
              tunnelType: formState.type.value,
              tunnelParams: {vlanId: formState.vlanId},
            },
          },
        },
      });
    } else if (
      formState.tunnelDest.label === TUNNEL_DEST.ip.label &&
      formState.node1 !== ''
    ) {
      onUpdateRef.current({
        configField: formState.node1.value,
        draftValue: {
          tunnelConfig: {
            [formState.ipAddress]: {
              enabled: formState.enabled,
              dstIp: formState.ipAddress,
              tunnelType: formState.type.value,
              tunnelParams: {vlanId: formState.vlanId},
            },
          },
        },
      });
    }
  }, [onUpdateRef, formState]);

  return (
    <Grid container direction="column" spacing={1}>
      <Grid item>
        <MaterialReactSelect
          textFieldProps={{
            label: 'Tunnel Type',
            InputLabelProps: {shrink: true},
          }}
          getOptionValue={option => option.label}
          options={Object.values(TUNNEL_TYPES)}
          required={true}
          onChange={handleTypeChange}
          value={formState.type}
        />
      </Grid>
      {formState.type.label === TUNNEL_TYPES.vxlan.label && (
        <Grid item>
          <TextField
            id="vlanId"
            key="vlanId"
            label="Vlan Id *"
            type="number"
            InputLabelProps={{shrink: true}}
            margin="dense"
            fullWidth
            value={formState.vlanId}
            onChange={handleInputChange(val => ({vlanId: val}))}
          />
        </Grid>
      )}
      <Grid item>
        <MaterialReactSelect
          textFieldProps={{
            label: 'Tunneling To',
            InputLabelProps: {shrink: true},
          }}
          getOptionValue={option => option.label}
          options={Object.values(TUNNEL_DEST)}
          required={true}
          onChange={handleTunnelDestChange}
          value={formState.tunnelDest}
        />
      </Grid>
      <Grid item>
        <MaterialReactSelect
          textFieldProps={{
            label: 'Node 1 *',
            InputLabelProps: {shrink: true},
          }}
          getOptionValue={option => option.label}
          options={nodeMenuItems}
          required={true}
          onChange={handleNode1NameChange}
          value={formState.node1}
        />
      </Grid>
      <Grid item>
        {formState.tunnelDest.label === TUNNEL_DEST.ip.label ? (
          <TextField
            id="name"
            key="name"
            label="External IP Addres *"
            InputLabelProps={{shrink: true}}
            margin="dense"
            fullWidth
            value={formState.ipAddress}
            onChange={handleInputChange(val => ({ipAddress: val}))}
          />
        ) : (
          <MaterialReactSelect
            textFieldProps={{
              label: 'Node 2 *',
              InputLabelProps: {shrink: true},
            }}
            getOptionValue={option => option.label}
            options={nodeMenuItems}
            required={true}
            onChange={handleNode2NameChange}
            value={formState.node2}
          />
        )}
      </Grid>
      <Grid item>
        <FormControlLabel
          data-testid="checkbox"
          control={React.createElement(Checkbox, {
            checked: formState.enabled === true,
            onChange: handleEnableChange,
            value: String(formState.enabled) || '',
            color: 'primary',
          })}
          label={'Tunnel Enabled:'}
        />
      </Grid>
    </Grid>
  );
}
