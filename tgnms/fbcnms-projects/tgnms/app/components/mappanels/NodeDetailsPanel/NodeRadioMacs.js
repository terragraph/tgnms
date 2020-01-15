/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import StatusText from '../../common/StatusText';
import Typography from '@material-ui/core/Typography';
import {CtrlVerType, ctrlVerBefore} from '../../../helpers/VersionHelper';
import {isNodeAlive} from '../../../helpers/NetworkHelpers';
import {makeStyles} from '@material-ui/styles';

import type {NetworkConfig} from '../../../NetworkContext';
import type {NodeType} from '../../../../shared/types/Topology';

const useStyles = makeStyles(theme => ({
  indented: {
    marginLeft: theme.spacing(1),
    overflowWrap: 'break-word',
    wordBreak: 'break-all',
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
}));

export type Props = {
  ctrlVersion: string,
  node: NodeType,
  networkConfig: NetworkConfig,
};

export default function NodeRadioMacs(props: Props) {
  const classes = useStyles();
  const {ctrlVersion, node, networkConfig} = props;
  const statusReport = networkConfig.status_dump.statusReports[node.mac_addr];
  if (!node.hasOwnProperty('wlan_mac_addrs') || !node.wlan_mac_addrs.length) {
    return null;
  }
  return (
    <div>
      <Typography variant="subtitle2">Radio MACs</Typography>
      <div className={classes.indented}>
        {node.wlan_mac_addrs.map(mac => {
          return (
            <div className={classes.spaceBetween} key={mac} data-testid={mac}>
              <Typography variant="body2">{mac}</Typography>
              {!ctrlVerBefore(ctrlVersion, CtrlVerType.M43) ? (
                <Typography variant="body2">
                  <StatusText
                    status={
                      statusReport &&
                      statusReport.radioStatus &&
                      statusReport.radioStatus[mac]
                        ? statusReport.radioStatus[mac].initialized &&
                          isNodeAlive(node.status)
                        : null
                    }
                  />
                </Typography>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
