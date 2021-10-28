/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import ClipboardTooltip from '@fbcnms/tg-nms/app/components/common/ClipboardTooltip';
import NodeBgpStatus from './NodeBgpStatus';
import NodeEthernetLinks from './NodeEthernetLinks';
import NodeLinksAndSite from './NodeLinksAndSite';
import NodeOffline from '@fbcnms/tg-nms/app/components/troubleshootingAutomation/NodeOffline';
import NodePolarity from './NodePolarity';
import NodeRadioMacs from './NodeRadioMacs';
import NodeSoftwareVersion from './NodeSoftwareVersion';
import NodeTunnels from './NodeTunnels';
import PopOffline from '@fbcnms/tg-nms/app/components/troubleshootingAutomation/PopOffline';
import React from 'react';
import StatusText from '@fbcnms/tg-nms/app/components/common/StatusText';
import Typography from '@material-ui/core/Typography';
import moment from 'moment';
import {NodeTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {formatNumber} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {
  hasNodeEverGoneOnline,
  isNodeAlive,
  renderAvailabilityWithColor,
} from '@fbcnms/tg-nms/app/helpers/NetworkHelpers';
import {makeStyles} from '@material-ui/styles';

import type {
  NetworkState as NetworkConfig,
  NetworkHealth,
} from '@fbcnms/tg-nms/shared/dto/NetworkState';
import type {
  NodeType,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {StatusReportType} from '@fbcnms/tg-nms/shared/types/Controller';

const useStyles = makeStyles(() => ({
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
}));

export type Props = {
  ctrlVersion: string,
  node: NodeType,
  statusReport?: ?StatusReportType,
  networkNodeHealth: NetworkHealth,
  networkConfig: NetworkConfig,
  onSelectLink: string => any,
  onSelectSite: string => any,
  topology: TopologyType,
};

function getAvailability(node: NodeType, networkNodeHealth: NetworkHealth) {
  const nodeHealth = networkNodeHealth.events || {};
  let alivePerc = 0;
  if (nodeHealth.hasOwnProperty(node.name)) {
    alivePerc = nodeHealth[node.name].linkAlive;
  }
  return alivePerc;
}

export default function NodeDetails(props: Props) {
  const classes = useStyles();
  const {
    ctrlVersion,
    node,
    statusReport,
    networkNodeHealth,
    networkConfig,
    topology,
    onSelectSite,
    onSelectLink,
  } = props;
  const availability = getAvailability(node, networkNodeHealth);

  // Combine some node properties in one string
  let nodeType =
    Object.keys(NodeTypeValueMap).find(
      key => NodeTypeValueMap[key] === node.node_type,
    ) || 'unknown';
  const nodeProperties = [];
  if (node.pop_node) {
    nodeProperties.push('POP');
  }
  if (nodeProperties.length > 0) {
    nodeType += ' (' + nodeProperties.join(', ') + ')';
  }

  return (
    <>
      <div className={classes.spaceBetween}>
        <Typography variant="subtitle2">Status</Typography>
        <Typography variant="body2">
          {!isNodeAlive(node.status) &&
            (node.pop_node ? <PopOffline /> : <NodeOffline />)}
          <StatusText
            status={isNodeAlive(node.status)}
            falseText={
              hasNodeEverGoneOnline(node, networkConfig.offline_whitelist)
                ? undefined
                : 'Offline (never seen)'
            }
          />
        </Typography>
      </div>
      <div className={classes.spaceBetween}>
        <Typography variant="subtitle2">Node MAC</Typography>
        <Typography variant="body2">{node.mac_addr || 'none'}</Typography>
      </div>
      <NodeRadioMacs
        ctrlVersion={ctrlVersion}
        node={node}
        networkConfig={networkConfig}
      />
      <div className={classes.spaceBetween}>
        <Typography variant="subtitle2">IPv6</Typography>
        <Typography variant="body2">
          {statusReport ? (
            <ClipboardTooltip title={statusReport.ipv6Address} enabled={true}>
              <span>{statusReport.ipv6Address}</span>
            </ClipboardTooltip>
          ) : (
            'none'
          )}
        </Typography>
      </div>
      <div className={classes.spaceBetween}>
        <Typography variant="subtitle2">Node Type</Typography>
        <Typography variant="body2">{nodeType}</Typography>
      </div>
      {statusReport && (
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Hardware Type</Typography>
          <Typography variant="body2">
            {statusReport.hardwareBoardId}
          </Typography>
        </div>
      )}
      {node.ant_azimuth > 0.0 ? (
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Azimuth</Typography>
          <Typography variant="body2">
            {formatNumber(node.ant_azimuth)}&deg;
          </Typography>
        </div>
      ) : null}
      <div className={classes.spaceBetween}>
        <Typography variant="subtitle2">Last Reported</Typography>
        <Typography variant="body2">
          {statusReport
            ? moment(new Date(statusReport.timeStamp * 1000)).fromNow()
            : 'n/a'}
        </Typography>
      </div>
      <div className={classes.spaceBetween}>
        <Typography variant="subtitle2">Availability</Typography>
        <Typography variant="body2">
          {renderAvailabilityWithColor(formatNumber(availability))}
        </Typography>
      </div>
      <NodePolarity
        ctrlVersion={ctrlVersion}
        node={node}
        networkConfig={networkConfig}
      />
      <NodeTunnels nodeName={node.name} />
      <NodeEthernetLinks node={node} topology={topology} />
      {statusReport && statusReport.version ? (
        <NodeSoftwareVersion version={statusReport.version} />
      ) : null}
      {statusReport && statusReport.bgpStatus ? (
        <NodeBgpStatus bgpStatus={statusReport.bgpStatus} />
      ) : null}
      <NodeLinksAndSite
        node={node}
        topology={topology}
        onSelectLink={onSelectLink}
        onSelectSite={onSelectSite}
      />
    </>
  );
}
