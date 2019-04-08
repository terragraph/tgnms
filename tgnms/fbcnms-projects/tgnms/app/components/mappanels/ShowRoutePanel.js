/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {apiServiceRequest} from '../../apiutils/ServiceAPIUtil';
import CircularProgress from '@material-ui/core/CircularProgress';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import {getShowRoutesIcon} from '../../helpers/MapPanelHelpers';
import FormGroup from '@material-ui/core/FormGroup';
import MenuItem from '@material-ui/core/MenuItem';
import PropTypes from 'prop-types';
import React from 'react';
import Select from '@material-ui/core/Select';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing.unit,
  },
  sectionSpacer: {
    height: theme.spacing.unit,
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  centered: {
    textAlign: 'center',
  },
});

class ShowRoutePanel extends React.Component {
  state = {
    expanded: true,

    // API request state
    isLoading: false,
    errorMsg: null,

    // selected destination node
    selectedDstNode: '',
  };

  componentDidMount() {
    // TODO Directly cancel promises instead (e.g. via axios.CancelToken)
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  findLinkInTopology(node1, node2) {
    const {topology} = this.props;
    const link = topology.links.filter(
      link =>
        (link.a_node_name === node1 && link.z_node_name === node2) ||
        (link.a_node_name === node2 && link.z_node_name === node1),
    );
    return link.length ? link[0] : null;
  }

  updateRouteLinksWeights(src_node_name, routes) {
    const {onUpdateRoutes} = this.props;

    const weights = {};
    const nodes = new Set();
    let max_weight = 0;

    // for each possible route
    routes.map(route => {
      let prev_node = null;
      // iterate through all nodes
      route.map(node_name => {
        if (prev_node) {
          // find link in topology
          const link = this.findLinkInTopology(prev_node, node_name);
          if (link) {
            // increment weights for this link
            if (!weights[link.name]) {
              weights[link.name] = 0;
            }
            weights[link.name] += 1;
            // keep track of maximum weight
            max_weight = Math.max(weights[link.name], max_weight);
          }
        }
        prev_node = node_name;
        nodes.add(node_name);
      });
    });

    // normalize weights to [0-1] range
    const normalized_weights = {};
    if (max_weight > 0) {
      Object.keys(weights).forEach(key => {
        normalized_weights[key] = (weights[key] * 1.0) / max_weight;
      });
    }

    // update weights (will be used in links rendering)
    onUpdateRoutes({
      node: src_node_name,
      links: normalized_weights,
      nodes,
    });
  }

  onRouteToNodeRequest(src_node_name, dst_node_name) {
    const {networkName} = this.props;
    const {isLoading} = this.state;

    // if route exists or loading - just show it
    if (!isLoading) {
      this.setState({
        isLoading: true,
        selectedDstNode: dst_node_name,
      });
    }

    // Make API request
    const data = {srcNode: src_node_name, dstNode: dst_node_name};
    apiServiceRequest(networkName, 'getRoutes', data)
      .then(response => {
        if (!this._isMounted) {
          return; // component no longer mounted, so discard response
        }

        this.updateRouteLinksWeights(src_node_name, response.data.routes);

        this.setState({
          isLoading: false,
          selectedDstNode: dst_node_name,
        });
      })
      .catch(_error => {
        if (!this._isMounted) {
          return; // component no longer mounted, so discard response
        }

        this.setState({
          isLoading: false,
          selectedDstNode: '',
        });
      });
  }

  renderPopNodes() {
    // Render list of nearby nodes
    const {topology, classes, routes} = this.props;
    const nodes = topology.nodes.filter(node => node.pop_node);

    return (
      <FormGroup row={false} className={classes.formGroup}>
        <Select
          value={this.state.selectedDstNode}
          key={routes.node}
          className={classes.select}
          onChange={event =>
            this.onRouteToNodeRequest(routes.node, event.target.value)
          }>
          {nodes.map(node => {
            return (
              <MenuItem key={node.name} value={node.name}>
                {node.name}
              </MenuItem>
            );
          })}
        </Select>
      </FormGroup>
    );
  }

  renderHeader() {
    // Render header text
    return (
      <>
        <Typography variant="subheading">Show routes to PoP node:</Typography>
      </>
    );
  }

  renderLoading() {
    const {classes} = this.props;
    return (
      <div className={classes.centered}>
        <CircularProgress />
      </div>
    );
  }

  renderPanel() {
    const {isLoading} = this.state;
    return (
      <div style={{width: '100%'}}>
        {this.renderHeader()}
        {isLoading ? this.renderLoading() : this.renderPopNodes()}
      </div>
    );
  }

  render() {
    const {classes, routes, onClose} = this.props;
    const {expanded} = this.state;

    return (
      <CustomExpansionPanel
        title={routes.node}
        titleIcon={getShowRoutesIcon({classes: {root: classes.iconCentered}})}
        details={this.renderPanel()}
        expanded={expanded}
        onChange={() => this.setState({expanded: !expanded})}
        onClose={onClose}
      />
    );
  }
}

ShowRoutePanel.propTypes = {
  classes: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  networkName: PropTypes.string.isRequired,
  topology: PropTypes.object.isRequired,
  routes: PropTypes.object.isRequired,
  onUpdateRoutes: PropTypes.func.isRequired,
};

export default withStyles(styles)(ShowRoutePanel);
