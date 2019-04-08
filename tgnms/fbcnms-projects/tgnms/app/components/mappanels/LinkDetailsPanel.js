/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {apiServiceRequestWithConfirmation} from '../../apiutils/ServiceAPIUtil';
import BuildIcon from '@material-ui/icons/Build';
import {
  createActionsMenu,
  getLinkIcon,
  getNodeIcon,
} from '../../helpers/MapPanelHelpers';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import DeleteIcon from '@material-ui/icons/Delete';
import Divider from '@material-ui/core/Divider';
import {formatNumber} from '../../helpers/StringHelpers';
import {
  isNodeAlive,
  renderAvailabilityWithColor,
  renderStatusWithColor,
  hasLinkEverGoneOnline,
} from '../../helpers/NetworkHelpers';
import {LinkActionType} from '../../../thrift/gen-nodejs/Controller_types';
import {LinkType} from '../../../thrift/gen-nodejs/Topology_types';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import PropTypes from 'prop-types';
import React from 'react';
import StatusIndicator, {StatusIndicatorColor} from '../common/StatusIndicator';
import SyncIcon from '@material-ui/icons/Sync';
import SyncDisabledIcon from '@material-ui/icons/SyncDisabled';
import {toTitleCase} from '../../helpers/StringHelpers';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing.unit,
  },
  listItemIcon: {
    marginRight: 0,
  },
  sectionSpacer: {
    height: theme.spacing.unit,
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
});

class LinkDetailsPanel extends React.Component {
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
    const {link} = this.props;

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
      ignitionEnabled,
      networkConfig,
    } = this.props;
    const availability = this.getAvailability(link, networkLinkHealth);
    const linkType = Object.keys(LinkType).find(
      key => LinkType[key] === link.link_type,
    );

    return (
      <>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Status</Typography>
          <Typography>
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
            <Typography variant="subtitle2">Type</Typography>
            <Typography>
              {linkType ? toTitleCase(linkType) : 'unknown'}
            </Typography>
          </div>
        ) : null}
        {link.is_backup_cn_link ? (
          <div className={classes.spaceBetween}>
            <Typography variant="subtitle2">Role</Typography>
            <Typography>Backup CN Link</Typography>
          </div>
        ) : null}
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Azimuth</Typography>
          <Typography>{formatNumber(link._meta_.angle, 1)}&deg;</Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Length</Typography>
          <Typography>
            {formatNumber(link._meta_.distance, 1)} meters
          </Typography>
        </div>
        {!ignitionEnabled ? (
          <div className={classes.spaceBetween}>
            <Typography variant="subtitle2">Link Ignition</Typography>
            <Typography>
              {renderStatusWithColor(ignitionEnabled, 'Enabled', 'Disabled')}
            </Typography>
          </div>
        ) : null}
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Ignition Attempts</Typography>
          <Typography>{formatNumber(link.linkup_attempts)}</Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Availability</Typography>
          <Typography>
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
    const {classes, expanded, onPanelChange, onClose, onPin, link} = this.props;

    return (
      <CustomExpansionPanel
        title={link.name}
        titleIcon={getLinkIcon({classes: {root: classes.iconCentered}})}
        details={this.renderPanel()}
        expanded={expanded}
        onChange={onPanelChange}
        onClose={onClose}
        onPin={onPin}
        pinned={this.props.pinned}
        showLoadingBar={true}
        showTitleCopyTooltip={true}
      />
    );
  }
}

LinkDetailsPanel.propTypes = {
  classes: PropTypes.object.isRequired,
  expanded: PropTypes.bool.isRequired,
  onPanelChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  networkName: PropTypes.string.isRequired,
  link: PropTypes.object.isRequired,
  nodeMap: PropTypes.object.isRequired,
  networkLinkHealth: PropTypes.object.isRequired,
  ignitionEnabled: PropTypes.bool.isRequired,
  onSelectNode: PropTypes.func.isRequired,
  pinned: PropTypes.bool.isRequired,
  onPin: PropTypes.func.isRequired,
};

export default withStyles(styles)(LinkDetailsPanel);
