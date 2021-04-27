/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import swal from 'sweetalert2';
import {
  LinkTypeValueMap,
  NodeTypeValueMap as NodeType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import {apiRequest} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {
  createReactSelectInput,
  createSelectInput,
} from '@fbcnms/tg-nms/app/helpers/FormHelpers';
import {isEqual} from 'lodash';
import {toTitleCase} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {useComputeNewLinkBearings} from './useComputeNewLinkBearings';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {withForwardRef} from '@fbcnms/ui/components/ForwardRef';
import {withStyles} from '@material-ui/core/styles';
import type {ComputeNewLinkBearings} from './useComputeNewLinkBearings';
import type {ForwardRef} from '@fbcnms/ui/components/ForwardRef';
import type {
  LinkType,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {NodeMap} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

const styles = {
  button: {
    margin: '8px 4px',
    float: 'right',
  },
};

export type Props = {|
  className?: string,
  expanded: boolean,
  onPanelChange: () => any,
  onClose: (?string) => any,
  initialParams: {},
  networkName: string,
  topology: TopologyType,
|};

type State = {|
  linkNode1: string,
  linkNode1Mac: string,
  linkNode2: string,
  linkNode2Mac: string,
  link_type: number,
  is_backup_cn_link?: boolean,
  initialParams: {},
  recomputeNodeAzimuth: boolean,
|};

type FormProps = {|
  nodeMap: NodeMap,
  computeNewLinkBearings: ComputeNewLinkBearings,
|};

export type AddLinkFormProps = {|
  ...Props,
  ...FormProps,
  ...{|
    classes: {[string]: string},
  |},
|};
const AddLinkForm = withStyles(styles)(
  class AddLinkForm extends React.Component<AddLinkFormProps, State> {
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
        recomputeNodeAzimuth: true,
        ...props.initialParams,
      };
    }

    componentDidUpdate(prevProps: AddLinkFormProps) {
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

    async onSubmit() {
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

      if (
        this.enableBackupCnOption() &&
        this.state.is_backup_cn_link !== null
      ) {
        link.is_backup_cn_link = this.state.is_backup_cn_link;
      }

      try {
        await apiRequest({
          networkName,
          endpoint: 'addLink',
          data: {link},
        });
        if (
          link.link_type === LinkTypeValueMap.WIRELESS &&
          this.state.recomputeNodeAzimuth
        ) {
          const nodeA = this.props.nodeMap[a_node_name];
          const nodeZ = this.props.nodeMap[z_node_name];
          const {bearingA, bearingZ} = this.props.computeNewLinkBearings(link);
          //node azimuths range [0,360], bearings are [-180,180]
          const azimuthA = (bearingA + 360) % 360;
          const azimuthZ = (bearingZ + 360) % 360;
          const AZIMUTH_EPSILON = 0.2;

          const requests = [];
          if (Math.abs(nodeA.ant_azimuth - azimuthA) > AZIMUTH_EPSILON) {
            requests.push(
              apiRequest({
                networkName,
                endpoint: 'editNode',
                data: {
                  nodeName: a_node_name,
                  newNode: {...nodeA, ant_azimuth: azimuthA},
                },
              }),
            );
          }
          if (Math.abs(nodeZ.ant_azimuth - azimuthZ) > AZIMUTH_EPSILON) {
            requests.push(
              apiRequest({
                networkName,
                endpoint: 'editNode',
                data: {
                  nodeName: z_node_name,
                  newNode: {...nodeZ, ant_azimuth: azimuthZ},
                },
              }),
            );
          }
          await Promise.all(requests);
        }
        onClose('success');
      } catch (error) {
        onClose(error.message);
      }
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

    render() {
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
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={this.state.recomputeNodeAzimuth}
                onChange={e =>
                  this.setState({
                    recomputeNodeAzimuth: e.target.checked,
                  })
                }
                name="checkedA"
              />
            }
            label={
              <Typography color="textSecondary" variant="body2">
                Recompute node bearings
              </Typography>
            }
          />
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
  },
);

export default withForwardRef(function AddLinkPanel({
  fwdRef,
  ...props
}: Props & ForwardRef) {
  const {className, expanded, onPanelChange} = props;
  const {nodeMap} = useNetworkContext();
  const computeNewLinkBearings = useComputeNewLinkBearings();
  return (
    <CustomAccordion
      className={className}
      title="Add Link"
      details={
        <AddLinkForm
          computeNewLinkBearings={computeNewLinkBearings}
          nodeMap={nodeMap}
          {...props}
        />
      }
      expanded={expanded}
      onChange={onPanelChange}
      data-testid="add-link-panel"
      fwdRef={fwdRef}
    />
  );
});
