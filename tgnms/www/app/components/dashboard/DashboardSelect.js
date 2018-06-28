/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Select from 'react-select';
import React from 'react';
import {DEFAULT_DASHBOARD_NAMES} from '../../constants/NetworkDashboardConstants.js';

export default class DashboardSelect extends React.Component {
  render() {
    const dashboardsOptions = [];
    if (this.props.dashboards) {
      Object.keys(this.props.dashboards).forEach(dashboardName => {
        // Keep default dashboards at the top of the drop down list
        const option = {
          label: dashboardName,
          value: dashboardName,
        };
        if (Object.values(DEFAULT_DASHBOARD_NAMES).includes(dashboardName)) {
          dashboardsOptions.unshift(option);
        } else {
          dashboardsOptions.push(option);
        }
      });
      dashboardsOptions;
      dashboardsOptions.push({
        label: 'New Dashboard ...',
        value: '#New',
      });
    }

    let topButtons = [];
    let selector = (
      <td width={310}>
        <div style={{width: 300}}>
          <Select
            options={dashboardsOptions}
            name="Select Dashboard"
            placeholder="Select Dashboard"
            value={this.props.selectedDashboard}
            onChange={val => this.props.selectDashboardChange(val)}
            clearable={false}
          />
        </div>
      </td>
    );
    if (
      this.props.dashboards &&
      this.props.selectedDashboard &&
      this.props.dashboards[this.props.selectedDashboard]
    ) {
      if (this.props.editView) {
        selector = (
          <td width={330} key="b_name">
            <button
              className="graph-button name-button"
              onClick={this.props.onDashboardNameChange}>
              Change Dashboard Name: {this.props.selectedDashboard}
            </button>
          </td>
        );
        topButtons = [
          <td key="b_add">
            <button
              className="graph-button top-button"
              onClick={this.props.onAddGraphButtonClicked}>
              Add Graph
            </button>
          </td>,
          <td key="b_save">
            <button
              className="graph-button top-button"
              onClick={this.props.saveDashboards}>
              Save Changes
            </button>
          </td>,
          <td key="b_done">
            <button
              className="graph-button top-button"
              onClick={this.props.onDoneEdit}>
              Done Editing
            </button>
          </td>,
          <td key="b_delete">
            <button
              className="graph-button top-button"
              onClick={this.props.onDeleteDashboard}>
              Delete Dashboard
            </button>
          </td>,
        ];
      } else {
        topButtons = [
          <td key="b_edit">
            <button
              className="graph-button top-button"
              onClick={this.props.onEdit}>
              Edit Dashboard
            </button>
          </td>,
        ];
      }
    }

    return (
      <div id="dashboard-select">
        <h3>
          <strong>Dashboards</strong>
          {'  | ' + this.props.topologyName}
        </h3>
        <table
          style={{
            borderCollapse: 'separate',
            borderSpacing: '5px 5px',
            display: 'block',
            width: '100px',
          }}>
          <tbody>
            <tr>
              {selector}
              {topButtons}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}
