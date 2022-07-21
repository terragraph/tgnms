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
import Autocomplete from '@material-ui/lab/Autocomplete';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import MenuItem from '@material-ui/core/MenuItem';
import SchedulerModal from '@fbcnms/tg-nms/app/components/scheduler/SchedulerModal';
import TextField from '@material-ui/core/TextField';
import {
  SCAN_SERVICE_MODE,
  SCAN_SERVICE_TYPES,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {makeStyles} from '@material-ui/styles';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {NodeType} from '@fbcnms/tg-nms/shared/types/Topology';

export const NETWORK_SCAN = 'Network';

export const FULL_NETWORK_SCAN_OPTION = {
  value: NETWORK_SCAN,
  groupKey: 'Network',
};

export function createItem(mac: string, node: NodeType) {
  return {
    title: mac,
    value: mac,
    groupKey: `${node.site_name}: ${node.name}`,
  };
}

const useStyles = makeStyles(theme => ({
  selector: {
    marginTop: theme.spacing(1.5),
  },
  autocomplete_root: {
    paddingTop: theme.spacing(1),
  },
}));

type Props = {
  modalProps: $Shape<React.ElementConfig<typeof SchedulerModal>>,
  formProps: any,
};

export default function ScheduleScanModal(props: Props) {
  const classes = useStyles();
  const {formState, updateFormState, handleInputChange} = props.formProps;
  const {networkName, nodeMap} = useNetworkContext();

  const options = React.useMemo(() => {
    return [
      {title: networkName, ...FULL_NETWORK_SCAN_OPTION}, // Full Network Scan
      ...Object.keys(nodeMap)
        .map(key => {
          const node = nodeMap[key];
          return node.wlan_mac_addrs.map(mac => createItem(mac, node));
        })
        .flat(),
    ];
  }, [nodeMap, networkName]);

  return (
    <SchedulerModal
      {...props.modalProps}
      scheduleParams={{
        typeSelector: (
          <TextField
            className={classes.selector}
            disabled
            value={SCAN_SERVICE_TYPES[formState.type]}
            InputProps={{disableUnderline: true}}
            fullWidth
          />
        ),
        itemSelector: (
          <Autocomplete
            data-testid="autocomplete"
            size="small"
            classes={{root: classes.autocomplete_root}}
            defaultValue={formState.item}
            disableClearable={true}
            options={options}
            groupBy={option => option.groupKey}
            getOptionLabel={option => option.title}
            style={{width: 250}}
            renderInput={params => <TextField {...params} variant="outlined" />}
            onChange={(_, value) => {
              updateFormState({item: value});
            }}
          />
        ),
        advancedParams: (
          <FormGroup row={false}>
            <FormLabel component="legend">
              <span>Scan Mode</span>
            </FormLabel>
            <TextField
              select
              variant="outlined"
              value={formState.mode}
              InputLabelProps={{shrink: true}}
              margin="dense"
              fullWidth
              onChange={handleInputChange(val => ({mode: val}))}>
              {Object.keys(SCAN_SERVICE_MODE).map(mode => (
                <MenuItem key={mode} value={mode}>
                  {SCAN_SERVICE_MODE[mode]}
                </MenuItem>
              ))}
            </TextField>
          </FormGroup>
        ),
      }}
    />
  );
}
