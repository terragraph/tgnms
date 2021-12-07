/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Grid from '@material-ui/core/Grid';
import MaterialReactSelect from '@fbcnms/tg-nms/app/components/common/MaterialReactSelect';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {
  getConfigOverrides,
  getTunnelConfigs,
} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import {useUpdateConfig} from '@fbcnms/tg-nms/app/hooks/useUpdateConfig';

const TUNNEL_TYPES = {
  gre: {label: 'GRE', value: 'GRE_L2'},
  srv6: {label: 'SRV6', value: 'SRV6'},
  vxlan: {label: 'VXLAN', value: 'VXLAN'},
};

const TUNNEL_DEST = {
  node: {label: 'Node', value: 'node'},
  ip: {label: 'External IP Address', value: 'ip'},
};

export type L2TunnelInputParams = {|
  nodeName: string,
  tunnelName: string,
|};

type FormType = {|
  name: string,
  enabled: boolean,
  node1: ?{label: string, value: string},
  node1Interface: string,
  type: ?$Values<typeof TUNNEL_TYPES>,
  node2?: ?{label: string, value: string},
  node2Interface?: string,
  tunnelDest: $Values<typeof TUNNEL_DEST>,
  ipAddress?: string,
|};

const DEFAULT_FORM_VALUE: FormType = {
  name: '',
  enabled: true,
  node1: null,
  node1Interface: '',
  node2: null,
  node2Interface: '',
  type: TUNNEL_TYPES.gre,
  tunnelDest: TUNNEL_DEST.node,
  ipAddress: '',
};

const cleanTunnelName = (name: string) => {
  return name.trim().toLowerCase();
};

export default function L2TunnelInputs({
  initialParams,
  onClose,
}: {
  initialParams?: ?L2TunnelInputParams,
  onClose?: () => void,
}) {
  const {networkConfig} = useNetworkContext();
  const {topology} = networkConfig;
  const {onCancel, nodeOverridesConfig} = useConfigTaskContext();
  const {setL2TunnelInitialParams} = useTopologyBuilderContext();

  React.useEffect(() => {
    return () => setL2TunnelInitialParams(null);
  }, [setL2TunnelInitialParams]);

  const updateConfig = useUpdateConfig();
  const nodeMenuItems = React.useMemo(
    () =>
      topology.nodes.reduce((result, node) => {
        result.push({
          label: node.name,
          value: node.name,
        });
        return result;
      }, []),
    [topology.nodes],
  );

  const configOverrides = React.useMemo(
    () => getConfigOverrides(networkConfig),
    [networkConfig],
  );

  // If initialParams were passed in, then we are in editting mode.
  const isEditMode = !!initialParams;
  const defaultValue: FormType = React.useMemo(() => {
    if (initialParams) {
      // Grabs the tunnel information for the src node of the tunnel.
      const src = getTunnelConfigs(configOverrides, initialParams.nodeName)[
        initialParams.tunnelName
      ];
      const defaultValue: FormType = {
        name: initialParams.tunnelName,
        enabled: src.enabled,
        node1: nodeMenuItems.find(elem => elem.value == initialParams.nodeName),
        node1Interface: src.localInterface,
        type: objectValuesTypesafe(TUNNEL_TYPES).find(
          elem => elem.value == src.tunnelType,
        ),
        tunnelDest: src.dstIp ? TUNNEL_DEST.ip : TUNNEL_DEST.node,
      };
      if (src.dstIp) {
        // Is external IP tunnel
        defaultValue.ipAddress = src.dstIp;
      } else {
        // Is node-to-node tunnel
        const dstNodeName = src.dstNodeName;
        // Grabs the tunnel information for the dst node of the tunnel.
        const dst = getTunnelConfigs(configOverrides, dstNodeName)[
          initialParams.tunnelName
        ];
        defaultValue.node2 = nodeMenuItems.find(
          elem => elem.value == dstNodeName,
        );
        defaultValue.node2Interface = dst.localInterface;
      }
      return defaultValue;
    } else {
      return DEFAULT_FORM_VALUE;
    }
  }, [initialParams, configOverrides, nodeMenuItems]);

  const {formState, updateFormState, handleInputChange} = useForm({
    initialState: defaultValue,
  });

  const handleTypeChange = React.useCallback(
    target => {
      updateFormState({type: {label: target.label, value: target.value}});
    },
    [updateFormState],
  );

  const handleTunnelDestChange = React.useCallback(
    target => {
      updateFormState({
        // Reset these fields so they don't affect validation.
        ipAddress: '',
        node2: null,
        node2Interface: '',
        tunnelDest: {label: target.label, value: target.value},
      });
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

  const isInvalidName = React.useMemo(() => {
    // We do not allow renaming in EDIT mode, thus the name is
    // valid by default.
    let isInvalid = false;
    if (!isEditMode) {
      // CREATE mode, i.e. initial params is null.
      const invalidNames = new Set<string>();
      const nodes = [formState.node1?.value, formState.node2?.value].filter(
        x => !!x,
      );
      // Get all invalid names.
      for (const nodeName of nodes) {
        const tunnels = getTunnelConfigs(configOverrides, nodeName);
        Object.keys(tunnels).forEach(tunnelName =>
          invalidNames.add(cleanTunnelName(tunnelName)),
        );
      }
      isInvalid = invalidNames.has(cleanTunnelName(formState.name));
    }
    return isInvalid;
  }, [isEditMode, configOverrides, formState]);

  const isInvalidForm = React.useMemo(() => {
    if (formState.name == '') {
      return true;
    }
    const isValidNodeToNode =
      formState.tunnelDest.label === TUNNEL_DEST.node.label &&
      formState.node1 &&
      formState.node2;
    const isValidNodeToIP =
      formState.tunnelDest.label === TUNNEL_DEST.ip.label &&
      formState.node1 &&
      formState.ipAddress;
    if (!(isValidNodeToNode || isValidNodeToIP)) {
      return true;
    }
    return false;
  }, [formState]);
  const isSubmitDisabled = isInvalidForm || isInvalidName;

  const handleSubmit = React.useCallback(() => {
    let drafts;
    if (formState.tunnelDest.label === TUNNEL_DEST.node.label) {
      drafts = {
        [formState.node1.value]: {
          tunnelConfig: {
            [formState.name]: {
              enabled: formState.enabled,
              dstNodeName: formState.node2.value,
              tunnelType: formState.type.value,
              localInterface: formState.node1Interface,
              tunnelParams: formState.vlanId
                ? {vlanId: Number(formState.vlanId)}
                : {},
            },
          },
        },
        [formState.node2.value]: {
          tunnelConfig: {
            [formState.name]: {
              enabled: formState.enabled,
              dstNodeName: formState.node1.value,
              tunnelType: formState.type.value,
              localInterface: formState.node2Interface,
              tunnelParams: formState.vlanId
                ? {vlanId: Number(formState.vlanId)}
                : {},
            },
          },
        },
      };
    } else {
      drafts = {
        [formState.node1.value]: {
          tunnelConfig: {
            [formState.name]: {
              enabled: formState.enabled,
              localInterface: formState.node1Interface,
              dstIp: formState.ipAddress,
              tunnelType: formState.type.value,
              tunnelParams: formState.vlanId
                ? {vlanId: Number(formState.vlanId)}
                : {},
            },
          },
        },
      };
    }

    updateConfig.node({
      drafts: drafts,
      currentConfig: nodeOverridesConfig,
      jsonConfig: null,
    });
    if (onClose) onClose();
  }, [formState, updateConfig, nodeOverridesConfig, onClose]);

  return (
    <Grid container direction="column" spacing={1}>
      <Grid item>
        <TextField
          id="name"
          label="Tunnel Name *"
          fullWidth
          dense
          error={isInvalidName}
          helperText={isInvalidName ? 'Name already taken.' : ''}
          disabled={isEditMode}
          value={formState.name}
          onChange={handleInputChange(val => ({name: val}))}
        />
      </Grid>
      <Grid item>
        <MaterialReactSelect
          inputId="tunnel-type"
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
      {(formState.type.label === TUNNEL_TYPES.vxlan.label ||
        formState.type.label === TUNNEL_TYPES.srv6.label) && (
        <Grid item>
          <TextField
            id="vlanId"
            key="vlanId"
            label="Vlan ID"
            type="number"
            InputLabelProps={{shrink: true}}
            margin="dense"
            fullWidth
            value={formState.vlanId}
            onChange={handleInputChange(val => ({vlanId: Number(val)}))}
          />
        </Grid>
      )}
      <Grid item>
        <MaterialReactSelect
          inputId={'tunnel-dest'}
          textFieldProps={{
            label: 'Tunneling To *',
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
          isDisabled={isEditMode}
          inputId={'node-1'}
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
        <TextField
          id="node1Interface"
          key="node1Interface"
          label="Node 1 Local Interface"
          InputLabelProps={{shrink: true}}
          margin="dense"
          fullWidth
          value={formState.node1Interface}
          onChange={handleInputChange(val => ({node1Interface: val}))}
        />
      </Grid>
      <Grid item>
        {formState.tunnelDest.label === TUNNEL_DEST.ip.label ? (
          <TextField
            id="ipAddress"
            key="ipAddress"
            label="External IP Address *"
            InputLabelProps={{shrink: true}}
            margin="dense"
            fullWidth
            value={formState.ipAddress}
            onChange={handleInputChange(val => ({ipAddress: val}))}
          />
        ) : (
          <>
            <MaterialReactSelect
              inputId={'node-2'}
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
            <TextField
              id="node2Interface"
              key="node2Interface"
              label="Node 2 Local Interface"
              InputLabelProps={{shrink: true}}
              margin="dense"
              fullWidth
              value={formState.node2Interface}
              onChange={handleInputChange(val => ({node2Interface: val}))}
            />
          </>
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
          label={'Tunnel Enabled'}
        />
      </Grid>
      <Grid item>
        <Grid container spacing={2} justify="flex-end">
          <Grid item>
            <Button
              onClick={onCancel}
              data-testid="cancel-button"
              variant="text">
              Cancel
            </Button>
          </Grid>
          <Grid item>
            <Button
              type="submit"
              data-testid="submit-button"
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}>
              Submit
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
