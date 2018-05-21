/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Dispatcher from '../../NetworkDispatcher.js';
import Modal from 'react-modal';
import Select from 'react-select';
import React from 'react';
import swal from 'sweetalert';

export default class DashboardSelect extends React.Component {
  render() {
    const dashboardsOptions = [];
    if (this.props.dashboards) {
      Object.keys(this.props.dashboards).forEach(dashboardName => {
        dashboardsOptions.push({
          value: dashboardName,
          label: dashboardName,
        });
      });
      dashboardsOptions.push({
        value: '#New',
        label: 'New Dashboard ...',
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
              style={{width: '300px', height: '34px'}}
              className="graph-button"
              onClick={() => this.onDashboardNameChange()}>
              {this.props.selectedDashboard}
            </button>
          </td>
        );
        topButtons = [
          <td key="b_add">
            <button
              style={{width: '100px', height: '34px'}}
              className="graph-button"
              onClick={() => this.props.addGraph()}>
              Add Graph
            </button>
          </td>,
          <td key="b_done">
            <button
              style={{width: '100px', height: '34px'}}
              className="graph-button"
              onClick={() => this.props.onDoneEdit()}>
              Done Editing
            </button>
          </td>,
        ];
      } else {
        topButtons = [
          <td key="b_delete">
            <button
              style={{width: '80px', height: '34px'}}
              className="graph-button"
              onClick={() => this.props.deleteDashboard()}>
              Delete
            </button>
          </td>,
          <td key="b_edit">
            <button
              style={{width: '80px', height: '34px'}}
              className="graph-button"
              onClick={() => this.props.onEdit()}>
              Edit
            </button>
          </td>,
          <td key="b_save">
            <button
              style={{width: '100px', height: '34px'}}
              className="graph-button"
              onClick={() => this.props.saveDashboards()}>
              Save Changes
            </button>
          </td>,
        ];
      }
    }

    return (
      <div id="dashboard-select">
        <h3>Dashboard</h3>
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
