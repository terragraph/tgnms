/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import NodeBgpRoutes from './NodeBgpRoutes';
import React from 'react';
import StatusText from '@fbcnms/tg-nms/app/components/common/StatusText';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';
import {objectEntriesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';

import type {
  BgpInfo,
  BgpStatusMap,
} from '@fbcnms/tg-nms/shared/types/Controller';

const useStyles = makeStyles(theme => ({
  bgpEntryWrapper: {
    paddingTop: 4,
  },
  text: {
    overflowWrap: 'break-word',
    wordBreak: 'break-all',
  },
  sectionHeading: {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: theme.palette.grey[700],
    paddingTop: theme.spacing(1),
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
}));

type Props = {
  bgpStatus: BgpStatusMap,
};

export default function NodeBgpStatus(props: Props) {
  const classes = useStyles();
  const {bgpStatus} = props;

  return (
    <>
      <Typography variant="subtitle2" className={classes.sectionHeading}>
        BGP Neighbors
      </Typography>
      {objectEntriesTypesafe<string, BgpInfo>(bgpStatus).map(([ip, info]) => (
        <div key={ip} className={classes.bgpEntryWrapper}>
          <Typography variant="subtitle2">{ip}</Typography>
          <div className={classes.text}>
            <div className={classes.spaceBetween}>
              <Typography variant="body2">Status</Typography>
              <Typography variant="body2">
                <StatusText
                  status={info.online}
                  trueText="Established"
                  falseText="Disconnected"
                />
              </Typography>
            </div>
            <div className={classes.spaceBetween}>
              <Typography variant="body2">ASN</Typography>
              <Typography variant="body2">{info.asn}</Typography>
            </div>
            <div className={classes.spaceBetween}>
              <Typography variant="body2">
                {info.online ? 'Uptime' : 'Downtime'}
              </Typography>
              <Typography variant="body2">{info.upDownTime}</Typography>
            </div>
            <div className={classes.spaceBetween}>
              <Typography variant="body2">
                {isNaN(info.stateOrPfxRcd) ? 'State' : 'Received Prefixes'}
              </Typography>
              <Typography variant="body2">{info.stateOrPfxRcd}</Typography>
            </div>
            {info.advertisedRoutes.length ? (
              <NodeBgpRoutes
                routes={info.advertisedRoutes}
                title="Advertised Routes"
              />
            ) : null}
            {info.receivedRoutes.length ? (
              <NodeBgpRoutes
                routes={info.receivedRoutes}
                title="Received Routes"
              />
            ) : null}
          </div>
        </div>
      ))}
    </>
  );
}
