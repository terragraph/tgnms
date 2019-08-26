/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import BuildIcon from '@material-ui/icons/Build';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import DeleteIcon from '@material-ui/icons/Delete';
import Divider from '@material-ui/core/Divider';
import GrafanaLink, {GrafanaDashboardUUID} from '../common/GrafanaLink';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import StatsIcon from '@material-ui/icons/BarChart';
import StatusIndicator, {StatusIndicatorColor} from '../common/StatusIndicator';
import SyncDisabledIcon from '@material-ui/icons/SyncDisabled';
import SyncIcon from '@material-ui/icons/Sync';
import Text from '@fbcnms/i18n/Text';
import Typography from '@material-ui/core/Typography';
import {LinkActionTypeValueMap as LinkActionType} from '../../../shared/types/Controller';
import {LinkTypeValueMap as LinkType} from '../../../shared/types/Topology';
import {STATS_LINK_QUERY_PARAM} from '../../constants/ConfigConstants';
import {apiServiceRequestWithConfirmation} from '../../apiutils/ServiceAPIUtil';
import {
  createActionsMenu,
  getLinkIcon,
  getNodeIcon,
} from '../../helpers/MapPanelHelpers';
import {formatNumber} from '../../helpers/StringHelpers';
import {get} from 'lodash';
import {
  hasLinkEverGoneOnline,
  isNodeAlive,
  renderAvailabilityWithColor,
  renderStatusWithColor,
} from '../../helpers/NetworkHelpers';
import {toTitleCase} from '../../helpers/StringHelpers';
import {withForwardRef} from '@fbcnms/ui/components/ForwardRef';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

import type {ForwardRef} from '@fbcnms/ui/components/ForwardRef';
import type {
  LinkType as Link,
  NodeType as Node,
} from '../../../shared/types/Topology';
import type {
  LinkMeta,
  NetworkConfig,
  NetworkHealth,
} from '../../NetworkContext';
import type {RouterHistory} from 'react-router-dom';

const styles = theme => ({
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing(1),
  },
  listItemIcon: {
    marginRight: theme.spacing(2),
    minWidth: 'unset',
  },
  sectionSpacer: {
    height: theme.spacing(1),
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
});

type Props = {
  classes: {[string]: string},
  expanded: boolean,
  history: RouterHistory,
  ignitionEnabled: boolean,
  link: Link & LinkMeta,
  networkName: string,
  nodeMap: {[string]: Node},
  networkConfig: NetworkConfig,
  networkLinkHealth: NetworkHealth,
  networkLinkMetrics: {},
  onClose: () => any,
  onPanelChange: () => any,
  onPin: () => any,
  onSelectNode: string => any,
  pinned: boolean,
} & ForwardRef;

type State = {};

class LinkDetailsPanel extends React.Component<Props, State> {
  state = {};

  getAvailability(link, networkLinkHealth) {
    // Get link availability percentage
    const linkHealth = networkLinkHealth.events || {};

    let alivePerc = 0;
    if (linkHealth.hasOwnProperty(link.name)) {
      alivePerc = linkHealth[link.name].linkAvailForData || NaN;
    }
    return alivePerc;
  }

  onSendSetLinkStatus(action, type) {
    // Send an assoc/dissoc request
    const {link, networkName} = this.props;

    const data = {action};
    apiServiceRequestWithConfirmation(networkName, 'setLinkStatus', data, {
      desc: `Pick the node to initiate this <strong>${type}</strong> request.`,
      descType: 'html',
      choices: {
        [link.a_node_name]: link.a_node_name,
        [link.z_node_name]: link.z_node_name,
      },
      processInput: (data, value) => {
        return {
          ...data,
          initiatorNodeName: value,
          responderNodeName:
            value === link.a_node_name ? link.z_node_name : link.a_node_name,
        };
      },
    });
  }

  onChangeLinkIgnitionState() {
    // Turn automatic ignition for this link on/off
    const {link, networkName} = this.props;

    const data = {};
    apiServiceRequestWithConfirmation(networkName, 'setIgnitionState', data, {
      title: 'Change Ignition State?',
      desc: `Toggle automatic ignition of <strong>${link.name}</strong>:`,
      descType: 'html',
      choices: {
        true: 'Enable Ignition',
        false: 'Disable Ignition',
      },
      processInput: (data, value) => {
        return {
          ...data,
          linkAutoIgnite: {[link.name]: value === 'true'},
        };
      },
    });
  }

  onShowStats() {
    // Take user to the stats page with pre-populated link
    const {link, history, networkName} = this.props;

    history.push({
      pathname: '/stats/' + networkName,
      search: `?${STATS_LINK_QUERY_PARAM}=${link.name}`,
    });
  }

  onDeleteLink() {
    // Delete this link
    const {link, networkName} = this.props;

    const data = {
      aNodeName: link.a_node_name,
      zNodeName: link.z_node_name,
    };
    apiServiceRequestWithConfirmation(networkName, 'delLink', data, {
      desc: `Do you want to permanently delete <strong>${link.name}</strong>?`,
      descType: 'html',
      checkbox: 'Force link deletion (even if ignited)',
      processInput: (data, value) => {
        return {...data, force: !!value};
      },
    });
  }

  renderActions() {
    // Render actions
    const {link, networkName} = this.props;

    const actionItems = [
      ...(link.link_type === LinkType.WIRELESS
        ? [
            {
              heading: 'Commands',
              actions: [
                {
                  label: 'Send Assoc',
                  icon: <SyncIcon />,
                  func: () =>
                    this.onSendSetLinkStatus(LinkActionType.LINK_UP, 'assoc'),
                },
                {
                  label: 'Send Dissoc',
                  icon: <SyncDisabledIcon />,
                  func: () =>
                    this.onSendSetLinkStatus(
                      LinkActionType.LINK_DOWN,
                      'dissoc',
                    ),
                },
                {
                  label: 'Change Ignition State',
                  icon: <BuildIcon />,
                  func: () => this.onChangeLinkIgnitionState(),
                },
              ],
            },
          ]
        : []),
      {
        heading: 'Topology',
        actions: [
          {
            label: 'Show Stats',
            icon: <StatsIcon />,
            func: () => this.onShowStats(),
          },
          {
            label: 'View in Grafana',
            icon: <OpenInNewIcon />,
            component: props => (
              <GrafanaLink
                {...props}
                dashboard={GrafanaDashboardUUID.link}
                vars={{
                  'var-network': networkName,
                }}
                prometheusVars={{
                  'var-link_name': link.name,
                }}
              />
            ),
          },
          {
            label: 'Delete Link',
            icon: <DeleteIcon />,
            func: () => this.onDeleteLink(),
          },
        ],
      },
    ];

    return (
      <>
        <Divider />
        {createActionsMenu({actionItems}, this.state, this.setState.bind(this))}
      </>
    );
  }

  renderLinkNodes() {
    // Render link nodes
    const {classes, link, nodeMap} = this.props;
    const linkNodes = [
      {node: link.a_node_name, mac: link.a_node_mac},
      {node: link.z_node_name, mac: link.z_node_mac},
    ];

    return (
      <>
        <div className={classes.sectionSpacer} />
        <Divider />

        <List component="nav">
          {linkNodes.map(({node, mac}) => (
            <ListItem
              button
              dense
              key={node}
              onClick={() => this.props.onSelectNode(node)}>
              <ListItemIcon classes={{root: classes.listItemIcon}}>
                {getNodeIcon()}
              </ListItemIcon>
              <ListItemText
                primary={node}
                primaryTypographyProps={{variant: 'subtitle2'}}
                secondary={mac || null}
              />
              <ListItemSecondaryAction>
                <StatusIndicator
                  color={
                    isNodeAlive(nodeMap[node].status)
                      ? StatusIndicatorColor.GREEN
                      : StatusIndicatorColor.RED
                  }
                />
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </>
    );
  }

  renderDetails() {
    // Render details
    const {
      classes,
      link,
      networkLinkHealth,
      networkLinkMetrics,
      ignitionEnabled,
      networkConfig,
    } = this.props;
    const availability = this.getAvailability(link, networkLinkHealth);
    const linkAttempts = get(
      networkLinkMetrics,
      ['ignitionAttempts', link.name],
      null,
    );

    const linkType = Object.keys(LinkType).find(
      key => LinkType[key] === link.link_type,
    );
    return (
      <>
        <div className={classes.spaceBetween}>
          <Text i18nKey="status" variant="subtitle2">
            Status
          </Text>
          <Typography variant="body2">
            {renderStatusWithColor(
              link.is_alive,
              undefined,
              hasLinkEverGoneOnline(link, networkConfig.offline_whitelist)
                ? undefined
                : 'Offline (never seen)',
            )}
          </Typography>
        </div>
        {link.link_type !== LinkType.WIRELESS ? (
          <div className={classes.spaceBetween}>
            <Text i18nKey="type" variant="subtitle2">
              Type
            </Text>
            <Typography variant="body2">
              {linkType ? toTitleCase(linkType) : 'unknown'}
            </Typography>
          </div>
        ) : null}
        {link.is_backup_cn_link ? (
          <div className={classes.spaceBetween}>
            <Text i18nKey="role" variant="subtitle2">
              Role
            </Text>
            <Typography variant="body2">Backup CN Link</Typography>
          </div>
        ) : null}
        <div className={classes.spaceBetween}>
          <Text i18nKey="azimuth" variant="subtitle2">
            Azimuth
          </Text>
          <Typography variant="body2">
            {formatNumber(link._meta_.angle, 1)}&deg;
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Text i18nKey="length" variant="subtitle2">
            Length
          </Text>
          <Typography variant="body2">
            {formatNumber(link._meta_.distance, 1)} meters
          </Typography>
        </div>
        {!ignitionEnabled ? (
          <div className={classes.spaceBetween}>
            <Text i18nKey="link_ignition" variant="subtitle2">
              Link Ignition
            </Text>
            <Typography variant="body2">
              {renderStatusWithColor(ignitionEnabled, 'Enabled', 'Disabled')}
            </Typography>
          </div>
        ) : null}
        <div className={classes.spaceBetween}>
          <Text i18nKey="ignition_attempts_1day" variant="subtitle2">
            Ignition Attempts (1d)
          </Text>
          <Typography variant="body2">
            {linkAttempts ? formatNumber(Number.parseInt(linkAttempts)) : '-'}
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Text i18nKey="availability" variant="subtitle2">
            Availability
          </Text>
          <Typography variant="body2">
            {renderAvailabilityWithColor(formatNumber(availability))}
          </Typography>
        </div>

        {this.renderLinkNodes()}
      </>
    );
  }

  renderPanel() {
    return (
      <div style={{width: '100%'}}>
        {this.renderDetails()}
        {this.renderActions()}
      </div>
    );
  }

  render() {
    const {
      classes,
      expanded,
      fwdRef,
      onPanelChange,
      onClose,
      onPin,
      pinned,
      link,
    } = this.props;
    return (
      <CustomExpansionPanel
        title={link.name}
        titleIcon={getLinkIcon({classes: {root: classes.iconCentered}})}
        details={this.renderPanel()}
        expanded={expanded}
        onChange={onPanelChange}
        onClose={onClose}
        onPin={onPin}
        pinned={pinned}
        showLoadingBar={true}
        showTitleCopyTooltip={true}
        fwdRef={fwdRef}
      />
    );
  }
}

export default withForwardRef(withStyles(styles)(withRouter(LinkDetailsPanel)));
