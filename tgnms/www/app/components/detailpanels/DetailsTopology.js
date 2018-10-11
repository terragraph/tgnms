/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  availabilityColor,
  chartColor,
  versionSlicer,
  getTopologyStatusRows,
} from '../../helpers/NetworkHelpers.js';
import {ChartColors} from '../../constants/NetworkConstants.js';
import {NodeType} from '../../../thrift/gen-nodejs/Topology_types';
import {Panel} from 'react-bootstrap';
import PieChart from 'react-svg-piechart';
import React from 'react';

export default class DetailsTopology extends React.Component {
  state = {
    expandedVersion: null,
  };

  handleMouseEnterOnSector(sector) {
    this.setState({expandedVersion: sector});
  }

  _getVersionRows(topology) {
    const versionCounts = {};
    let totalReported = 0;
    topology.nodes.forEach(node => {
      if (
        node.hasOwnProperty('status_dump') &&
        node.status_dump.hasOwnProperty('version')
      ) {
        const version = node.status_dump.version;
        if (!versionCounts.hasOwnProperty(version)) {
          versionCounts[version] = 0;
        }
        versionCounts[version]++;
        totalReported++;
      }
    });

    let i = 0;
    const versionData = [];
    Object.keys(versionCounts)
      .sort()
      .forEach(version => {
        const count = versionCounts[version];
        versionData.push({
          color: chartColor(ChartColors, i),
          label: versionSlicer(version),
          value: count,
          index: i,
        });
        i++;
      });

    const versionPieChart = (
      <PieChart
        data={versionData}
        shrinkOnTouchEnd
        onSectorHover={this.handleMouseEnterOnSector.bind(this)}
        expandOnHover
      />
    );

    return versionData.map((element, i) => {
      const versionPerc =
        element.value > 0
          ? parseInt((parseInt(element.value, 10) / totalReported) * 100, 10)
          : 0;
      const expanded =
        this.state.expandedVersion && this.state.expandedVersion.index === i;
      return (
        <tr key={i}>
          {i === 0 ? (
            <td
              key="versionPieChart"
              rowSpan={versionData.length}
              width="120px">
              {versionPieChart}
            </td>
          ) : null}
          <td key={i} style={{color: element.color}}>
            <span style={{textDecoration: expanded ? 'underline' : null}}>
              {element.label}
            </span>
          </td>
          <td>
            <span style={{textDecoration: expanded ? 'underline' : null}}>
              {element.value} ({versionPerc}%)
            </span>
          </td>
        </tr>
      );
    });
  }

  _getCommitPlanRows() {
    const commitPlanRows = [];
    if (
      this.props.commitPlan &&
      (this.props.siteOverlay === 'CommitPlan' ||
        this.props.linkOverlay === 'CommitPlan')
    ) {
      commitPlanRows.push(
        <tr key="commit-plan-row-nav">
          <td className="commit-plan-batch-button-container">
            {this.props.commitPlanBatch > 0 && [
              <button
                type="button"
                key="commit-plan-back-button"
                className="btn btn-default"
                onClick={() => this.props.commitPlanBatchChangedCb(-1)}>
                <span className="glyphicon glyphicon-chevron-left" />
              </button>,
            ]}
          </td>
          <td>
            <span className="commit-plan-batch-nav-text">
              Batch {this.props.commitPlanBatch + 1}/{
                this.props.commitPlan.commitBatches.length
              }
            </span>
          </td>
          <td className="commit-plan-batch-button-container">
            {this.props.commitPlanBatch + 1 <
              this.props.commitPlan.commitBatches.length && [
              <button
                type="button"
                key="commit-plan-next-button"
                className="btn btn-default"
                onClick={() => this.props.commitPlanBatchChangedCb(1)}>
                <span className="glyphicon glyphicon-chevron-right" />
              </button>,
            ]}
          </td>
        </tr>,
        <tr key="commit-plan-row-nodes-count">
          <td colSpan="3" className="commit-plan-batch-container-text">
            <span className="commit-plan-batch-text">
              Nodes In Upgrade Batch:&nbsp;
              {
                this.props.commitPlan.commitBatches[this.props.commitPlanBatch]
                  .length
              }
            </span>
          </td>
        </tr>,
      );
    }
    return commitPlanRows;
  }

  render() {
    // average availability of all links across site
    let alivePercAvg = 0;
    let wirelessLinksCount = 0;
    // split availability metrics by dn/cn
    const alivePercByNodeType = {};
    Object.keys(this.props.links).forEach(linkName => {
      const link = this.props.links[linkName];
      if (link.link_type != 1) {
        // only wireless links
        return;
      }
      // skip links where mac is not defined on both sides
      if (
        !this.props.nodes.hasOwnProperty(link.a_node_name) ||
        !this.props.nodes.hasOwnProperty(link.z_node_name)
      ) {
        return;
      }
      const nodeA = this.props.nodes[link.a_node_name];
      const nodeZ = this.props.nodes[link.z_node_name];
      if (
        nodeA.mac_addr == null ||
        nodeZ.mac_addr == null ||
        !nodeA.mac_addr.length ||
        !nodeZ.mac_addr.length
      ) {
        return;
      }
      let alivePerc = 0;
      if (link.hasOwnProperty('alive_perc')) {
        alivePerc = parseInt(link.alive_perc * 1000, 10) / 1000.0;
      }
      // link availability by node type
      const nodeType =
        nodeA.node_type === NodeType.CN || nodeZ.node_type === NodeType.CN
          ? NodeType.CN
          : NodeType.DN;
      if (!alivePercByNodeType.hasOwnProperty(nodeType)) {
        alivePercByNodeType[nodeType] = [];
      }
      alivePercByNodeType[nodeType].push(alivePerc);
      // global link availability
      alivePercAvg += alivePerc;
      wirelessLinksCount++;
    });

    alivePercAvg /= wirelessLinksCount;
    alivePercAvg = parseInt(alivePercAvg * 1000, 10) / 1000.0;

    // compute availability by node type
    const nodeTypes = {};
    this.props.topology.nodes.forEach(node => {
      // calculate # of DNs, CNs
      if (!nodeTypes.hasOwnProperty(node.node_type)) {
        nodeTypes[node.node_type] = 0;
      }
      nodeTypes[node.node_type]++;
    });
    const availabilityRows = Object.keys(nodeTypes).map(
      (nodeType, nodeIndex) => {
        let nodeTypeName = 'Unknown';
        if (nodeType == NodeType.CN) {
          nodeTypeName = 'CN';
        } else if (nodeType == NodeType.DN) {
          nodeTypeName = 'DN';
        }
        let nodeAlivePerc = 0;
        if (alivePercByNodeType.hasOwnProperty(nodeType)) {
          // sum all individual availability
          nodeAlivePerc = alivePercByNodeType[nodeType].reduce(
            (a, b) => a + b,
            0,
          );
          // divide by # of links
          nodeAlivePerc /= alivePercByNodeType[nodeType].length;
        }
        return (
          <tr key={'nodeType-' + nodeType}>
            {nodeIndex === 0
              ? [
                  <td
                    key={'availability_total'}
                    rowSpan={Object.keys(nodeTypes).length}>
                    <span
                      className="details-availability-total"
                      style={{color: availabilityColor(alivePercAvg)}}>
                      {wirelessLinksCount ? alivePercAvg + '%' : 'No Data'}
                    </span>
                  </td>,
                  <td
                    key={'availability_arrow'}
                    rowSpan={Object.keys(nodeTypes).length}>
                    <span className="details-availability-arrow">&rarr;</span>
                  </td>,
                ]
              : ''}
            <td>
              <span className="details-availability-types">{nodeTypeName}</span>
            </td>
            <td>
              <span
                className="details-availability-types"
                style={{color: availabilityColor(nodeAlivePerc)}}>
                {nodeAlivePerc > 0
                  ? parseInt(nodeAlivePerc * 1000, 10) / 1000.0
                  : '0'}%
              </span>
            </td>
          </tr>
        );
      },
    );

    // show node versions pie chart
    const versionRows = this._getVersionRows(this.props.topology);
    const commitPlanRows = this._getCommitPlanRows();

    return (
      <Panel
        id="myModal"
        onMouseEnter={this.props.onEnter}
        onMouseLeave={this.props.onLeave}>
        <Panel.Heading>
          <span
            className="details-close"
            onClick={() => {
              this.props.onClose();
            }}>
            &times;
          </span>
          <Panel.Title componentClass="h3">Overview</Panel.Title>
        </Panel.Heading>
        <Panel.Body
          className="details"
          style={{maxHeight: this.props.maxHeight, width: '100%'}}>
          {commitPlanRows.length > 0 && [
            <div className="details-overview-title" key="commit_plan_heading">
              Upgrade Commit Plan
            </div>,
            <div className="details-overview-wrapper" key="commit_plan_table">
              <table className="details-overview-table">
                <tbody className="commit-plan-container-box">
                  {commitPlanRows}
                </tbody>
              </table>
            </div>,
          ]}
          <div className="details-overview-title">Availability (24h)</div>
          <div className="details-overview-wrapper">
            <table className="details-overview-table">
              <tbody>{availabilityRows}</tbody>
            </table>
          </div>
          <div className="details-overview-title">Current Status</div>
          <div className="details-overview-wrapper">
            <table className="details-overview-table details-overview-status-table">
              <tbody>{getTopologyStatusRows(this.props.topology)}</tbody>
            </table>
          </div>
          {versionRows.length > 0 && [
            <div className="details-overview-title" key="node_versions_heading">
              Node Versions
            </div>,
            <div className="details-overview-wrapper" key="node_versions_table">
              <table className="details-overview-table">
                <tbody>{versionRows}</tbody>
              </table>
            </div>,
          ]}
        </Panel.Body>
      </Panel>
    );
  }
}
