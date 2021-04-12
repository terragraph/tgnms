/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import PriorityHighIcon from '@material-ui/icons/PriorityHigh';
import Tooltip from '@material-ui/core/Tooltip';
import classNames from 'classnames';
import {Popup} from 'react-mapbox-gl';
import {SEVERITY} from '@fbcnms/alarms/components/severity/Severity';
import {TgApiUtil} from '../../alarms/TgAlarmApi';
import {convertType} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {locToPos} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {makeStyles} from '@material-ui/styles';
import {useHistory} from 'react-router';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useNetworkId} from '@fbcnms/alarms/components/hooks';

import type {LinkType, NodeType} from '@fbcnms/tg-nms/shared/types/Topology';

const ACTIVE_ALERT_STATUS = 'active';

const useStyles = makeStyles(theme => ({
  popUp: {
    '& div': {
      marginBottom: -theme.spacing(0.75),
      background: 'transparent !important',
      backgroundColor: 'transparent !important',
      boxShadow: 'none !important',
    },
  },
  iconWrapper: {
    borderRadius: '10%',
    width: 0,
    height: theme.spacing(0.5),
    borderStyle: 'solid',
    borderWidth: `${theme.spacing(4)}px ${theme.spacing(3)}px 0 ${theme.spacing(
      3,
    )}px`,
  },
  icon: {
    position: 'absolute',
    top: theme.spacing(0.5),
    left: theme.spacing(2.5),
  },
  CRITICAL: {
    borderColor: `${SEVERITY.CRITICAL.color} transparent`,
  },
  MAJOR: {
    borderColor: `${SEVERITY.MAJOR.color} transparent`,
  },
  MINOR: {
    borderColor: `${SEVERITY.MINOR.color} transparent`,
  },
  WARNING: {
    borderColor: `${SEVERITY.WARNING.color} transparent`,
  },
  INFO: {
    borderColor: `${SEVERITY.INFO.color} transparent`,
  },
  NOTICE: {
    borderColor: `${SEVERITY.NOTICE.color} transparent`,
  },
}));

export default function AlertsLayer() {
  const networkContext = useNetworkContext();
  const classes = useStyles();
  const history = useHistory();

  const [lastRefreshTime, _setLastRefreshTime] = React.useState(
    new Date().getTime().toString(),
  );

  const handleToAlerts = () => {
    const {networkName} = networkContext;
    history.push({
      pathname: '/alarms/' + networkName + '/alerts',
    });
  };

  const networkContextRef = React.useRef(networkContext);
  const networkId = useNetworkId();
  const {response} = TgApiUtil.useAlarmsApi(
    TgApiUtil.viewFiringAlerts,
    {networkId},
    lastRefreshTime,
  );

  const filteredAlerts = React.useMemo(
    () =>
      response?.reduce((res, alert) => {
        const {linkName, nodeName} = alert.labels;

        if (alert.status.state !== ACTIVE_ALERT_STATUS) {
          return res;
        }
        if (linkName) {
          const location = getLinkLocation({
            name: linkName,
            networkContext: networkContextRef.current,
          });
          if (location !== null) {
            res.push({
              location,
              severity: alert.labels.severity,
              assetName: linkName,
              alertName: alert.labels.alertname,
            });
          }
        } else if (nodeName) {
          const location = getNodeLocation({
            name: nodeName,
            networkContext: networkContextRef.current,
          });
          if (location !== null) {
            res.push({
              location,
              severity: alert.labels.severity,
              assetName: nodeName,
              alertName: alert.labels.alertname,
            });
          }
        }
        return res;
      }, []),
    [networkContextRef, response],
  );

  return filteredAlerts
    ? filteredAlerts.map<React.Node>(alert => (
        <Popup
          className={classes.popUp}
          key={'alert-popup-' + alert.assetName}
          coordinates={locToPos(alert.location)}>
          <div
            onClick={handleToAlerts}
            className={classNames(
              classes[alert.severity],
              classes.iconWrapper,
            )}>
            <Tooltip placement="top" title={alert.alertName}>
              <PriorityHighIcon className={classes.icon} />
            </Tooltip>
          </div>
        </Popup>
      ))
    : null;
}

function getLinkLocation({name, networkContext}) {
  const {nodeMap, siteMap, networkConfig} = networkContext;
  const {links} = networkConfig.topology;
  const selectedLink = convertType<?LinkType>(findAlertName(name, links));
  networkContext.siteToNodesMap;
  if (selectedLink) {
    const nodeA = nodeMap[selectedLink.a_node_name];
    const nodeZ = nodeMap[selectedLink.z_node_name];
    const siteA = siteMap[nodeA.site_name];
    const siteZ = siteMap[nodeZ.site_name];
    const inputs = {
      lat1: siteA.location.latitude,
      lon1: siteA.location.longitude,
      lat2: siteZ.location.latitude,
      lon2: siteZ.location.longitude,
    };
    return getLinkMidPoint(inputs);
  }
  return null;
}

function getNodeLocation({name, networkContext}) {
  const {siteMap, networkConfig} = networkContext;
  const {nodes} = networkConfig.topology;
  const selectedNode = convertType<?NodeType>(findAlertName(name, nodes));
  return selectedNode ? siteMap[selectedNode.site_name].location : null;
}

function getLinkMidPoint(inputs: {
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
}) {
  const dLon = (inputs.lon2 - inputs.lon1) * (Math.PI / 180);

  //convert to radians
  const lat1 = inputs.lat1 * (Math.PI / 180);
  const lat2 = inputs.lat2 * (Math.PI / 180);
  const lon1 = inputs.lon1 * (Math.PI / 180);

  const Bx = Math.cos(lat2) * Math.cos(dLon);
  const By = Math.cos(lat2) * Math.sin(dLon);
  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By),
  );
  const lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);

  //return in degrees
  return {
    latitude: lat3 * (180 / Math.PI),
    longitude: lon3 * (180 / Math.PI),
  };
}

function findAlertName(name, topologyArray) {
  return topologyArray.find(element =>
    name.split('_').reduce((res, subStr) => {
      if (element.name.includes(subStr) && res !== false) {
        return true;
      } else {
        return false;
      }
    }, true),
  );
}
