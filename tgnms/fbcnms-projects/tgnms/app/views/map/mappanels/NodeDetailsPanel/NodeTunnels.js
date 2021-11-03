/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import ArrowRightAlt from '@material-ui/icons/ArrowRightAlt';
import Button from '@material-ui/core/Button';
import Collapse from '@material-ui/core/Collapse';
import React, {useState} from 'react';
import StatusText from '@fbcnms/tg-nms/app/components/common/StatusText';
import Typography from '@material-ui/core/Typography';
import {get, isEmpty} from 'lodash';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {makeStyles} from '@material-ui/styles';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

type Props = {|
  nodeName: string,
|};

type TunnelInfoProps = {|
  name: string,
  info: any,
|};

const useStyles = makeStyles(() => ({
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  fullWidth: {
    width: '100%',
  },
  nested: {
    paddingLeft: 8,
  },
  tunnelButton: {
    width: '100%',
    textAlign: 'left',
  },
}));

export default function NodeTunnels(props: Props) {
  const classes = useStyles();
  const {networkConfig} = useNetworkContext();
  const parsed = React.useMemo(() => {
    const overrides = get(networkConfig, [
      'config_node_overrides',
      'overrides',
    ]);
    return !isNullOrEmptyString(overrides) ? JSON.parse(overrides) : null;
  }, [networkConfig]);

  const tunnelConfig = get(parsed, [props.nodeName, 'tunnelConfig']);
  if (tunnelConfig == null || isEmpty(tunnelConfig)) return null;
  return (
    <>
      <div className={classes.spaceBetween}>
        <Typography variant="subtitle2">Tunnels</Typography>
      </div>
      <div>
        {Object.entries(tunnelConfig).map(([tunnelName, tunnelInfo]) => (
          <TunnelInfo key={tunnelName} name={tunnelName} info={tunnelInfo} />
        ))}
      </div>
    </>
  );
}

function TunnelInfo({name, info}: TunnelInfoProps) {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  return (
    <div className={classes.fullWidth}>
      <Button
        fullWidth
        onClick={() => setOpen(!open)}
        startIcon={<ArrowRightAlt />}>
        <div className={classes.spaceBetween}>
          <Typography className={classes.tunnelButton} variant="subtitle2">
            {name}
          </Typography>
          <Typography variant="body2">
            <StatusText
              status={info.enabled}
              trueText={'Enabled'}
              falseText={'Disabled'}
            />
          </Typography>
        </div>
      </Button>
      <Collapse in={open} classes={{nested: classes.nested}}>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Local Interface</Typography>
          <Typography variant="body2">{info.localInterface}</Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">dstIp</Typography>
          <Typography variant="body2">{info.dstIp}</Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">dstNodeName</Typography>
          <Typography variant="body2">{info.dstNodeName}</Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Tunnel Type</Typography>
          <Typography variant="body2">{info.tunnelType}</Typography>
        </div>
        <Typography variant="subtitle2">Tunnel Params</Typography>
        {Object.entries(info.tunnelParams).map(([argName, argValue]) => (
          <Typography variant="body2">
            {argName}: {String(argValue)}
          </Typography>
        ))}
      </Collapse>
    </div>
  );
}
