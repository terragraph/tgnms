/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import {LinkTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {NodeTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {STEP_TARGET} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {cloneDeep} from 'lodash';
import {toTitleCase} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';

export default function LinkForm({index}: {index: number}) {
  const {
    elementType,
    updateTopology,
    newTopology,
    initialParams,
  } = useTopologyBuilderContext();
  const updateTopologyRef = React.useRef(updateTopology);
  const {networkConfig, nodeMap} = useNetworkContext();
  const {topology} = networkConfig;
  const {links, nodes} = newTopology;
  const linksRef = useLiveRef(links);

  const link = React.useMemo(() => {
    if (elementType !== TOPOLOGY_ELEMENT.SITE) {
      if (!initialParams.links) {
        return {};
      }
      return cloneDeep(initialParams.links[index]);
    }
    return cloneDeep(links[index]);
  }, [links, elementType, index, initialParams]);

  const {formState, updateFormState, handleInputChange} = useForm({
    initialState: {
      a_node_name: '',
      z_node_name: '',
      a_node_mac: '',
      z_node_mac: '',
      is_backup_cn_link: false,
      link_type: LinkTypeValueMap.WIRELESS,
      ...link,
    },
  });

  React.useEffect(() => {
    const newLinks = linksRef.current ?? [];
    newLinks[index] = formState;
    updateTopologyRef.current({links: newLinks});
  }, [linksRef, formState, index, updateTopologyRef]);

  const nodeMenuItems = React.useMemo(
    () => topology.nodes.map(node => node.name),
    [topology],
  );

  const fromNodeMenuItems = React.useMemo(() => {
    if (nodes[0]?.name) {
      return nodes.map(node => node.name);
    }
    return nodeMenuItems;
  }, [nodes, nodeMenuItems]);

  const getWlanMacAddrs = React.useCallback(
    nodeName => nodeMap[nodeName]?.wlan_mac_addrs,
    [nodeMap],
  );

  const aMacAddrs = React.useMemo(() => {
    if (formState.a_node_name?.length > 0) {
      return (
        getWlanMacAddrs(formState.a_node_name) ??
        nodes.find(node => node.name === formState.a_node_name)?.wlan_mac_addrs
      );
    }
    return null;
  }, [formState, getWlanMacAddrs, nodes]);

  const zMacAddrs = React.useMemo(() => {
    if (formState.z_node_name?.length > 0) {
      return getWlanMacAddrs(formState.z_node_name);
    }
    return null;
  }, [formState, getWlanMacAddrs]);

  const enableBackupLinkOption = React.useMemo(() => {
    const aName = formState.a_node_name;
    const zName = formState.z_node_name;
    if (
      aName?.length === 0 ||
      zName === 0 ||
      formState.link_type !== LinkTypeValueMap.WIRELESS
    ) {
      return false;
    }
    const aNodeType = nodeMap[aName]?.node_type;
    const zNodeType = nodeMap[zName]?.node_type;
    return (
      (aNodeType &&
        zNodeType &&
        aNodeType === NodeTypeValueMap.DN &&
        zNodeType === NodeTypeValueMap.CN) ||
      (aNodeType === NodeTypeValueMap.CN && zNodeType === NodeTypeValueMap.DN)
    );
  }, [formState, nodeMap]);

  return (
    <Grid
      container
      direction="column"
      spacing={2}
      className={`${STEP_TARGET.LINK_FORM}-${index}`}>
      <Grid item>
        <Autocomplete
          options={fromNodeMenuItems}
          value={formState.a_node_name}
          getOptionLabel={option => option}
          onChange={(_, value) => updateFormState({a_node_name: value})}
          renderInput={params => (
            <TextField
              {...params}
              InputLabelProps={{shrink: true}}
              margin="dense"
              label="From"
              data-testid="from-input"
            />
          )}
        />
      </Grid>
      {aMacAddrs && (
        <Grid item>
          <Autocomplete
            options={aMacAddrs}
            getOptionLabel={option => option}
            onChange={(_, value) => updateFormState({a_node_mac: value})}
            value={formState.a_node_mac}
            renderInput={params => (
              <TextField
                {...params}
                InputLabelProps={{shrink: true}}
                margin="dense"
                label="Radio Mac"
              />
            )}
          />
        </Grid>
      )}
      <Grid item>
        <Autocomplete
          options={nodeMenuItems}
          value={formState.z_node_name}
          getOptionLabel={option => option}
          onChange={(_, value) => updateFormState({z_node_name: value})}
          renderInput={params => (
            <TextField
              {...params}
              InputLabelProps={{shrink: true}}
              margin="dense"
              label="To"
              data-testid="to-input"
            />
          )}
        />
      </Grid>
      {zMacAddrs && (
        <Grid item>
          <Autocomplete
            options={zMacAddrs}
            getOptionLabel={option => option}
            value={formState.z_node_mac}
            onChange={(_, value) => updateFormState({z_node_mac: value})}
            renderInput={params => (
              <TextField
                {...params}
                InputLabelProps={{shrink: true}}
                margin="dense"
                label="Radio Mac"
              />
            )}
          />
        </Grid>
      )}
      <Grid item>
        <TextField
          label="Link Type"
          select
          InputLabelProps={{shrink: true}}
          margin="dense"
          fullWidth
          required={true}
          onChange={handleInputChange(val => ({link_type: val}))}
          value={formState.link_type}>
          {Object.keys(LinkTypeValueMap).map(linkTypeName => (
            <MenuItem value={LinkTypeValueMap[linkTypeName]}>
              {toTitleCase(linkTypeName)}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      {enableBackupLinkOption && (
        <Grid item>
          <Autocomplete
            options={[
              {label: 'Yes', value: true},
              {label: 'No', value: false},
            ]}
            getOptionLabel={option => option.label}
            onChange={(_, value) =>
              updateFormState({is_backup_cn_link: value.value})
            }
            renderInput={params => (
              <TextField
                {...params}
                fullWidth
                InputLabelProps={{shrink: true}}
                margin="dense"
                label="Backup CN Link"
                helperText="Backup links may be used only when the primary link is unavailable."
              />
            )}
          />
        </Grid>
      )}
    </Grid>
  );
}
