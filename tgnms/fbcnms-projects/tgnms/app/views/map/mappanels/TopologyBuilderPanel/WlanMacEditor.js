/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import DeleteIcon from '@material-ui/icons/Delete';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import StatusIndicator, {
  StatusIndicatorColor,
} from '@fbcnms/tg-nms/app/components/common/StatusIndicator';
import TextField from '@material-ui/core/TextField';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

export default function WlanMacEditor({
  index,
  wlan_mac,
  wlan_mac_addrs,
  onUpdate,
  nodeName,
}: {
  index: number,
  wlan_mac: string,
  wlan_mac_addrs: Array<string>,
  onUpdate: ({[string]: Array<string>}) => void,
  nodeName: string,
}) {
  const [errorMessage, setErrorMessage] = React.useState(null);
  const newMacs = React.useMemo(() => [...wlan_mac_addrs], [wlan_mac_addrs]);
  const {networkConfig, nodeMap} = useNetworkContext();
  const {topology, status_dump} = networkConfig;
  const {nodes} = topology;

  const deleteRadioMac = React.useCallback(
    index => {
      newMacs.splice(index, 1);
      onUpdate({wlan_mac_addrs: newMacs});
    },
    [newMacs, onUpdate],
  );

  const getNodeWithRadioMac = React.useCallback(() => {
    const firstIndex = wlan_mac_addrs.indexOf(wlan_mac);
    if (wlan_mac_addrs.indexOf(wlan_mac, firstIndex + 1) !== -1) {
      return 'another radio on this node';
    }

    const nodeWithRadioMac = nodes.filter(
      node =>
        node.name !== nodeName &&
        node.wlan_mac_addrs.some(macAddr => macAddr === wlan_mac.toLowerCase()),
    );
    return nodeWithRadioMac && nodeWithRadioMac.length === 1
      ? nodeWithRadioMac[0].name
      : null;
  }, [wlan_mac, wlan_mac_addrs, nodes, nodeName]);

  const handleErrorCheck = React.useCallback(() => {
    const nodeWithRadioMac = getNodeWithRadioMac();
    if (wlan_mac.length !== 17 && wlan_mac.length !== 0) {
      setErrorMessage('Must follow MAC address format FF:FF:FF:FF:FF:FF');
    } else if (nodeWithRadioMac !== null) {
      setErrorMessage(
        'This MAC address is already associated with ' + nodeWithRadioMac,
      );
    } else {
      setErrorMessage(null);
    }
  }, [getNodeWithRadioMac, wlan_mac]);

  const handelChange = React.useCallback(
    (value, index) => {
      newMacs[index] = value;
      onUpdate({wlan_mac_addrs: newMacs});
    },
    [newMacs, onUpdate],
  );
  const status = React.useMemo(() => {
    const nodeMacAddr = nodeMap[nodeName]?.mac_addr;
    const statusReport = status_dump.statusReports[nodeMacAddr];
    return statusReport &&
      statusReport.radioStatus &&
      statusReport.radioStatus[wlan_mac]
      ? statusReport.radioStatus[wlan_mac].initialized
      : null;
  }, [nodeMap, nodeName, status_dump, wlan_mac]);

  return (
    <TextField
      id={`wlan_mac_${index + 1}`}
      key={`wlan_mac_${index + 1}`}
      label={`Radio MAC Address ${index + 1}`}
      data-testid="wlan-mac"
      InputLabelProps={{shrink: true}}
      margin="dense"
      fullWidth
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <StatusIndicator
              color={
                status === null
                  ? StatusIndicatorColor.GREY
                  : status
                  ? StatusIndicatorColor.GREEN
                  : StatusIndicatorColor.RED
              }
            />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              data-testid={index + 'Delete'}
              onClick={() => deleteRadioMac(index)}>
              <DeleteIcon />
            </IconButton>
          </InputAdornment>
        ),
      }}
      value={wlan_mac}
      onChange={ev => handelChange(ev.target.value, index)}
      onBlur={() => {
        handleErrorCheck();
      }}
      helperText={errorMessage ? errorMessage : null}
      error={errorMessage ? true : false}
    />
  );
}
