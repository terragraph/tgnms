/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import swal from 'sweetalert2';
import {
  LinkTypeValueMap,
  NodeTypeValueMap as NodeType,
} from '../../../shared/types/Topology';
import {
  createReactSelectInput,
  createSelectInput,
} from '../../helpers/FormHelpers';
import {isEqual} from 'lodash';
import {sendTopologyBuilderRequest} from '../../helpers/MapPanelHelpers';
import {toTitleCase} from '../../helpers/StringHelpers';
import {withStyles} from '@material-ui/core/styles';
import type {LinkMeta} from '../../contexts/NetworkContext';
import type {
  LinkType,
  NodeType as Node,
  TopologyType,
} from '../../../shared/types/Topology';

const styles = {
  button: {
    margin: '8px 4px',
    float: 'right',
  },
};

type Props = {
  classes: {[string]: string},
  className?: string,
  expanded: boolean,
  onPanelChange: () => any,
  onClose: () => any,
  initialParams: {},
  linkMap: {[string]: LinkType & LinkMeta},
  networkName: string,
  nodeMap: {[string]: Node},
  nodeToLinksMap: {[string]: Set<string>},
  topology: TopologyType,
  macToNodeMap: {[string]: string},
};

type State = {
  linkNode1: string,
  linkNode1Mac: string,
  linkNode2: string,
  linkNode2Mac: string,
  link_type: number,
  is_backup_cn_link?: boolean,
  initialParams: {},
};

const MAX_DN = 2;
const MAX_CN = 15;
const MAX_HOP_COUNT = 10;
const MAX_CN_TO_POP = 100;

class AddLinkPanel extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      // Link properties
      linkNode1: null,
      linkNode1Mac: null,
      linkNode2: null,
      linkNode2Mac: null,
      link_type: null,
      is_backup_cn_link: null,
      ...props.initialParams,
    };
  }

  componentDidUpdate(prevProps: Props) {
    // Update state if initial values were added
    // TODO Do this somewhere else?
    if (
      this.props.initialParams &&
      Object.keys(this.props.initialParams).length > 0 &&
      !isEqual(this.props.initialParams, prevProps.initialParams)
    ) {
      this.updateInitialParams();
    }
  }

  updateInitialParams() {
    this.setState(this.props.initialParams);
  }

  countConnectedNodesByType(macs: Array<string>, links: Array<LinkType>) {
    const {macToNodeMap, nodeMap} = this.props;
    const counter = {};
    macs.forEach(mac => {
      counter[mac] = {cn: 0, dn: 0};
      const node = nodeMap[macToNodeMap[mac]];
      if (node.node_type === NodeType.DN) {
        links.forEach(link => {
          const linkMacs = [link.a_node_mac, link.z_node_mac];
          if (linkMacs.includes(node.mac_addr)) {
            const otherNodeMac =
              node.mac_addr === linkMacs[0] ? linkMacs[1] : linkMacs[0];
            const otherNode = nodeMap[macToNodeMap[otherNodeMac]];
            otherNode.node_type === NodeType.DN
              ? counter[mac].dn++
              : counter[mac].cn++;
          }
        });
      }
    });
    return counter;
  }

  findPopSites(nodes: Array<string>) {
    const {linkMap, nodeMap, nodeToLinksMap} = this.props;
    const stack = nodes;
    const exploredLinks = new Set();
    const pop_sites = new Set();
    let min_hop_count = 0;

    while (stack.length > 0) {
      [...nodeToLinksMap[stack.pop()]]
        .filter(linkName => !exploredLinks.has(linkName))
        .forEach(linkName => {
          exploredLinks.add(linkName);
          const link = linkMap[linkName];
          const aNode = nodeMap[link.a_node_name];
          const zNode = nodeMap[link.z_node_name];
          stack.push(aNode.name);
          stack.push(zNode.name);
          if (aNode.pop_node || zNode.pop_node) {
            if (min_hop_count === 0) {
              min_hop_count = exploredLinks.size;
            }
            aNode.pop_node
              ? pop_sites.add(aNode.site_name)
              : pop_sites.add(zNode.site_name);
          }
        });
    }
    return {
      connectedPopSites: pop_sites,
      min_hop_count,
    };
  }

  measureCNDensity() {
    let cnCount = 0;
    let popCount = 0;
    this.props.topology.nodes.forEach(node => {
      cnCount += node.node_type === NodeType.CN ? 1 : 0;
      popCount += node.pop_node ? 1 : 0;
    });
    if (popCount === 0) {
      // avoid divide by zero issue
      return 0;
    }
    return cnCount / popCount;
  }

  validateTopologyChange(linkNode1Mac: string, linkNode2Mac: string) {
    const {macToNodeMap, nodeMap, topology} = this.props;
    const node1 = nodeMap[macToNodeMap[linkNode1Mac]];
    const node2 = nodeMap[macToNodeMap[linkNode2Mac]];
    const counters = this.countConnectedNodesByType(
      [linkNode1Mac, linkNode2Mac],
      topology.links,
    );
    // counters: {[nodeMac]: {cn: number, dn: number}}
    const count1 = counters[linkNode1Mac];
    const count2 = counters[linkNode2Mac];
    // update counters based on potential new link endpoint's type
    // alert if limits are exceeded
    if (count1.cn + (node2.node_type === NodeType.CN ? 1 : 0) > MAX_CN) {
      swal({
        title: 'Distribution Limit Exceeded',
        text: `${node1.name} has already met the limit for CN distribution`,
        type: 'error',
      });
      return false;
    }
    if (count1.dn + (node2.node_type === NodeType.DN ? 1 : 0) > MAX_DN) {
      swal({
        title: 'Distribution Limit Exceeded',
        text: `${node1.name} has already met the limit for DN distribution`,
        type: 'error',
      });
      return false;
    }
    if (count2.cn + (node1.node_type === NodeType.CN ? 1 : 0) > MAX_CN) {
      swal({
        title: 'Distribution Limit Exceeded',
        text: `${node2.name} has already met the limit for CN distribution`,
        type: 'error',
      });
      return false;
    }
    if (count2.dn + (node1.node_type === NodeType.DN ? 1 : 0) > MAX_DN) {
      swal({
        title: 'Distribution Limit Exceeded',
        text: `${node2.name} has already met the limit for DN distribution`,
        type: 'error',
      });
      return false;
    }
    return true;
  }

  onSubmit() {
    const {networkName, onClose} = this.props;
    const {
      linkNode1,
      linkNode2,
      linkNode1Mac,
      linkNode2Mac,
      link_type,
    } = this.state;

    if (!linkNode1 || !linkNode2 || link_type === null) {
      swal({
        title: 'Incomplete Data',
        text: 'Please fill in all form fields.',
        type: 'error',
      });
      return;
    }

    if (link_type === LinkTypeValueMap.WIRELESS) {
      // max CN and DN distrubtion per DN check
      if (!this.validateTopologyChange(linkNode1Mac, linkNode2Mac)) {
        return;
      }
      // check PoP metrics
      // This will only display warnings and not block link creation
      const {connectedPopSites, min_hop_count} = this.findPopSites([
        linkNode1,
        linkNode2,
      ]);
      // availability check
      if (connectedPopSites.size === 0) {
        swal({
          title: 'PoP Access Unavailable',
          text: 'Create links that connect to a PoP to remove this warning.',
          type: 'warning',
        });
      }
      // route redundancy check
      if (connectedPopSites.size < 2) {
        swal({
          title: 'PoP Access Limited',
          text:
            'Create links with multiple routes to a PoP to remove this warning.',
          type: 'warning',
        });
      }
      // density check
      if (this.measureCNDensity() > MAX_CN_TO_POP) {
        swal({
          title: 'PoP/CN Density',
          text:
            'Create more PoPs to stop traffic from slowing down and to remove this warning.',
          type: 'warning',
        });
      }
      // radius check
      if (min_hop_count > MAX_HOP_COUNT) {
        swal({
          title: 'PoP Hop Count Exceeded',
          text:
            'Create links with a shorter route to a PoP to remove this warning.',
          type: 'warning',
        });
      }
    }

    let a_node_name, z_node_name, a_node_mac, z_node_mac;
    if (linkNode1 < linkNode2) {
      a_node_name = linkNode1;
      z_node_name = linkNode2;
      a_node_mac = linkNode1Mac;
      z_node_mac = linkNode2Mac;
    } else {
      a_node_name = linkNode2;
      z_node_name = linkNode1;
      a_node_mac = linkNode2Mac;
      z_node_mac = linkNode1Mac;
    }

    const link: $Shape<LinkType> = {
      a_node_name,
      z_node_name,
      link_type,
      a_node_mac,
      z_node_mac,
    };

    if (this.enableBackupCnOption() && this.state.is_backup_cn_link !== null) {
      link.is_backup_cn_link = this.state.is_backup_cn_link;
    }

    sendTopologyBuilderRequest(networkName, 'addLink', {link}, onClose);
  }

  enableBackupCnOption() {
    // Determines whether to show/use the "backup CN link" option
    // (only applicable for a wireless link to a CN)
    if (
      !this.state.linkNode1 ||
      !this.state.linkNode2 ||
      this.state.link_type !== LinkTypeValueMap.WIRELESS
    ) {
      return false;
    }

    const linkNode1Type = this.props.topology.nodes.find(
      node => node.name === this.state.linkNode1,
    )?.node_type;
    const linkNode2Type = this.props.topology.nodes.find(
      node => node.name === this.state.linkNode2,
    )?.node_type;
    return (
      (linkNode1Type === NodeType.DN && linkNode2Type === NodeType.CN) ||
      (linkNode1Type === NodeType.CN && linkNode2Type === NodeType.DN)
    );
  }

  renderForm() {
    const {classes} = this.props;
    const link1WlanMacs = this.getWlanMacAddrs('linkNode1');
    const link2WlanMacs = this.getWlanMacAddrs('linkNode2');

    // Create menu items
    const nodeMenuItems = this.props.topology.nodes.map(node => ({
      label: node.name,
      value: node.name,
    }));
    const linkTypeMenuItems = Object.keys(LinkTypeValueMap).map(
      linkTypeName => ({
        label: toTitleCase(linkTypeName),
        value: LinkTypeValueMap[linkTypeName],
      }),
    );
    const backupCnLinkMenuItems = [
      <MenuItem key="yes" value={true}>
        Yes
      </MenuItem>,
      <MenuItem key="no" value={false}>
        No
      </MenuItem>,
    ];

    return (
      <div style={{width: '100%'}}>
        {createReactSelectInput(
          {
            label: 'Node 1',
            value: 'linkNode1',
            required: true,
            selectOptions: nodeMenuItems,
            onChange: () =>
              this.setDefaultWlanMacAddr('linkNode1', 'linkNode1Mac'),
          },
          this.state,
          this.setState.bind(this),
        )}
        {link1WlanMacs &&
          createReactSelectInput(
            {
              label: 'Node 1 MAC',
              value: 'linkNode1Mac',
              selectOptions: link1WlanMacs.map(x => ({value: x, label: x})),
            },
            this.state,
            this.setState.bind(this),
          )}
        {createReactSelectInput(
          {
            label: 'Node 2',
            value: 'linkNode2',
            required: true,
            selectOptions: nodeMenuItems,
            onChange: () =>
              this.setDefaultWlanMacAddr('linkNode2', 'linkNode2Mac'),
          },
          this.state,
          this.setState.bind(this),
        )}
        {link2WlanMacs &&
          createReactSelectInput(
            {
              label: 'Node 2 MAC',
              value: 'linkNode2Mac',
              selectOptions: link2WlanMacs.map(x => ({value: x, label: x})),
            },
            this.state,
            this.setState.bind(this),
          )}
        {createReactSelectInput(
          {
            label: 'Link Type',
            value: 'link_type',
            required: true,
            selectOptions: linkTypeMenuItems,
          },
          this.state,
          this.setState.bind(this),
        )}
        {this.enableBackupCnOption() &&
          createSelectInput(
            {
              label: 'Backup CN Link',
              helperText:
                'Backup links may be used only when the primary link is unavailable.',
              value: 'is_backup_cn_link',
              required: false,
              menuItems: backupCnLinkMenuItems,
            },
            this.state,
            this.setState.bind(this),
          )}
        <div>
          <Button
            className={classes.button}
            variant="contained"
            color="primary"
            size="small"
            data-testid="add-link-button"
            onClick={() => this.onSubmit()}>
            Add Link
          </Button>
          <Button
            className={classes.button}
            variant="outlined"
            size="small"
            onClick={() => this.props.onClose()}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  render() {
    const {className, expanded, onPanelChange} = this.props;

    return (
      <CustomExpansionPanel
        className={className}
        title="Add Link"
        details={this.renderForm()}
        expanded={expanded}
        onChange={onPanelChange}
      />
    );
  }

  getWlanMacAddrs = stateKey => {
    const nodeName = this.state[stateKey];
    if (typeof nodeName !== 'string' || nodeName.trim() === '') {
      return null;
    }
    const node =
      this.props.topology &&
      this.props.topology.nodes &&
      this.props.topology.nodes.find(node => node.name === nodeName);
    if (node && node.wlan_mac_addrs && node.wlan_mac_addrs.length) {
      return node.wlan_mac_addrs;
    }
    return null;
  };

  setDefaultWlanMacAddr = (nodeStateKey, macStateKey: string) => {
    const macAddrs = this.getWlanMacAddrs(nodeStateKey);
    const defaultMacAddr = macAddrs && macAddrs.length > 0 ? macAddrs[0] : '';
    this.setState({
      ...this.state,
      ...{
        [macStateKey]: defaultMacAddr,
      },
    });
  };
}

export default withStyles(styles)(AddLinkPanel);
