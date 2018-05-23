/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import NetworkDashboardStats from './NetworkDashboardStats.js';
import Dispatcher from './NetworkDispatcher.js';
import PlotlyGraph from './PlotlyGraph.js';
import {Actions} from './constants/NetworkConstants.js';
import NetworkStore from './stores/NetworkStore.js';
import {render} from 'react-dom';
import ReactGridLayout, {WidthProvider} from 'react-grid-layout';
import Modal from 'react-modal';
import Select from 'react-select';
import React from 'react';
import swal from 'sweetalert';

const ReactGridLayoutWidthProvider = WidthProvider(ReactGridLayout);

export default class NetworkDashboards extends React.Component {
  state = {
    editView: false,
    dashboards: null,
    graphEditOpen: false,
    editedGraph: null,
    editedGraphIndex: null,
    modalIsOpen: false,
  };

  constructor(props) {
    super(props);
    this.getDashboards = this.getDashboards.bind(this);
    this.getDashboards(this.props.networkConfig.topology.name);
  }

  getDashboards(topologyName) {
    const getDashboards = new Request('/dashboards/get/' + topologyName, {
      credentials: 'same-origin',
    });
    fetch(getDashboards).then(
      function(response) {
        if (response.status == 200) {
          response.json().then(
            function(json) {
              this.setState({
                dashboards: json,
                editView: false,
              });
            }.bind(this),
          );
        }
      }.bind(this),
    );
  }

  onLayoutChange(layout) {
    const dashboards = this.state.dashboards;
    if (dashboards && this.props.selectedDashboard) {
      const dashboard = dashboards[this.props.selectedDashboard];
      const graphs = dashboard.graphs;
      let index = 0;
      layout.forEach(glayout => {
        const graph = graphs[index];
        graph.container.x = glayout.x;
        graph.container.y = glayout.y;
        graph.container.w = glayout.w;
        graph.container.h = glayout.h;
        index++;
      });
      this.setState({
        dashboards: dashboards,
      });
    }
  }

  UNSAFE_componentWillMount() {
    // register to receive topology updates
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_SELECTED:
        this.getDashboards(payload.networkName);
        break;
    }
  }

  selectDashboardChange(val) {
    if (val.value == '#New') {
      const dashboards = this.state.dashboards;
      swal(
        {
          title: 'Create Dashboard',
          text: 'Enter dashboard name:',
          type: 'input',
          showCancelButton: true,
          closeOnConfirm: false,
          animation: 'slide-from-top',
          inputPlaceholder: 'Dashboard name',
        },
        function(inputValue) {
          if (inputValue === false) {
            return false;
          }

          if (inputValue === '') {
            swal.showInputError('You need to write something!');
            return false;
          }
          if (dashboards[inputValue]) {
            swal.showInputError('Name Already exists');
            return false;
          }
          dashboards[inputValue] = {graphs: []};
          this.props.onHandleSelectedDashboardChange(inputValue);
          this.setState({
            dashboards: dashboards,
            editView: false,
          });
          swal('Added!', 'dashboard: ' + inputValue, 'success');
        }.bind(this),
      );
    } else {
      this.props.onHandleSelectedDashboardChange(val.label);
      this.setState({
        editView: false,
      });
    }
  }

  doneEditing() {
    this.setState({
      editView: false,
    });
  }

  addGraph() {
    const dashboards = this.state.dashboards;
    const dashboard = dashboards[this.props.selectedDashboard];
    const graphs = dashboard.graphs;
    graphs.push({
      name: 'Graph Name',
      min_ago: 30,
      agg_type: 'top',
      key_ids: [],
      data: [],
      container: {
        x: 0,
        y: Infinity,
        w: 3,
        h: 3,
      },
    });
    this.setState({
      dashboards: dashboards,
    });
  }

  editGraph(index) {
    const dashboards = this.state.dashboards;
    const dashboard = dashboards[this.props.selectedDashboard];
    const graphs = dashboard.graphs;
    this.setState({
      graphEditOpen: true,
      editedGraph: graphs[index],
      editedGraphIndex: index,
      modalIsOpen: true,
    });
  }

  editGraphName(index) {
    const dashboards = this.state.dashboards;
    const dashboard = dashboards[this.props.selectedDashboard];
    const graph = dashboard.graphs[index];
    swal(
      {
        title: 'New name',
        type: 'input',
        inputValue: graph.name,
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Rename',
        closeOnConfirm: false,
      },
      function(value) {
        const dashboards = this.state.dashboards;
        // update name
        dashboards[this.props.selectedDashboard].graphs[index].name = value;
        this.setState({
          dashboards: dashboards,
        });
        swal('Renamed', 'The selected dashboard was renamed.', 'success');
        this.saveDashboards();
      }.bind(this),
    );
  }

  graphEditClose(graph) {
    const dashboards = this.state.dashboards;
    const dashboard = dashboards[this.props.selectedDashboard];
    const graphs = dashboard.graphs;
    if (graph) {
      graphs[this.state.editedGraphIndex] = graph;
    }
    this.setState({
      graphEditOpen: false,
      dashboards: dashboards,
      editedGraph: null,
      editedGraphIndex: null,
      modalIsOpen: false,
    });
  }

  deleteGraph(index) {
    const dashboards = this.state.dashboards;
    const dashboard = dashboards[this.props.selectedDashboard];
    const graphs = dashboard.graphs;
    graphs.splice(index, 1);
    this.setState({
      dashboards: dashboards,
    });
  }

  deleteDashboard() {
    swal(
      {
        title: 'Are you sure?',
        text: 'This will delete the dashboard: ' + this.props.selectedDashboard,
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, do it!',
        closeOnConfirm: false,
      },
      function() {
        const dashboards = this.state.dashboards;
        delete dashboards[this.props.selectedDashboard];
        this.props.onHandleSelectedDashboardChange(null);
        this.setState({
          dashboards: dashboards,
        });
        swal('Deleted!', 'The selected dashboard was deleted.', 'success');
        this.saveDashboards();
      }.bind(this),
    );
  }

  saveDashboards() {
    this.saveDashboardsRequest = new XMLHttpRequest();
    this.saveDashboardsRequest.onload = function() {
      if (!this.saveDashboardsRequest) {
        return;
      }
      swal('Saved!', 'Dashboard get saved to server!', 'success');
    }.bind(this);
    try {
      this.saveDashboardsRequest.open('POST', '/dashboards/save/', true);
      const data = {
        dashboards: this.state.dashboards,
        topologyName: this.props.networkConfig.topology.name,
      };
      this.saveDashboardsRequest.send(JSON.stringify(data));
    } catch (e) {}
  }

  onDashboardNameChange() {
    const dashboards = this.state.dashboards;
    swal(
      {
        title: 'Dashboard Name',
        text: 'Enter dashboard name:',
        type: 'input',
        inputValue: this.props.selectedDashboard,
        showCancelButton: true,
        closeOnConfirm: false,
        animation: 'slide-from-top',
        inputPlaceholder: 'Write something',
      },
      function(inputValue) {
        if (inputValue === false) {
          return false;
        }
        if (inputValue === '') {
          swal.showInputError('You need to write something!');
          return false;
        }
        if (
          inputValue != this.props.selectedDashboard &&
          dashboards[inputValue]
        ) {
          swal.showInputError('Name Already exists');
          return false;
        }
        dashboards[inputValue] = dashboards[this.props.selectedDashboard];
        delete dashboards[this.props.selectedDashboard];
        this.props.onHandleSelectedDashboardChange(inputValue);
        this.setState({
          dashboards: dashboards,
        });
        swal(
          'Dashboard Name Chnaged!',
          'New dashboard name is: ' + inputValue,
          'success',
        );
      }.bind(this),
    );
  }

  render() {
    var layout = [];
    var layoutDivs = [];

    if (
      this.state.dashboards &&
      this.state.dashboards[this.props.selectedDashboard]
    ) {
      const dashboard = this.state.dashboards[this.props.selectedDashboard];
      const graphs = dashboard.graphs;
      var index = 0;
      graphs.forEach(graph => {
        const id = index.toString();
        layout.push({
          i: id,
          x: graph.container.x,
          y: graph.container.y,
          w: graph.container.w,
          h: graph.container.h,
          minW: 2,
          maxW: 6,
          minH: 3,
          static: this.state.editView ? false : true,
        });
        if (!this.state.editView) {
          layoutDivs.push(
            <div key={id}>
              <PlotlyGraph
                divkey={id}
                title={graph.name}
                options={graph}
              />
            </div>,
          );
        } else {
          layoutDivs.push(
            <div key={id}>
              <div>
                {graph.name}
                <button
                  style={{width: '100px', height: '34px', float: 'right'}}
                  className="graph-button"
                  onClick={this.editGraph.bind(this, index)}>
                  Edit Graph
                </button>
                <button
                  style={{width: '100px', height: '34px', float: 'right'}}
                  className="graph-button"
                  onClick={this.editGraphName.bind(this, index)}>
                  Edit Name
                </button>
                <button
                  style={{width: '100px', height: '34px', float: 'right'}}
                  className="graph-button"
                  onClick={this.deleteGraph.bind(this, index)}>
                  Delete Graph
                </button>
              </div>
            </div>,
          );
        }
        ++index;
      });
    }

    var dashboardsOptions = [];
    if (this.state.dashboards) {
      Object.keys(this.state.dashboards).forEach(dashboardName => {
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
            onChange={this.selectDashboardChange.bind(this)}
            clearable={false}
          />
        </div>
      </td>
    );
    if (this.props.selectedDashboard) {
      if (this.state.editView) {
        selector = (
          <td width={330} key="b_name">
            <button
              style={{width: '300px', height: '34px'}}
              className="graph-button"
              onClick={this.onDashboardNameChange.bind(this)}>
              {this.props.selectedDashboard}
            </button>
          </td>
        );
        topButtons = [
          <td key="b_add">
            <button
              style={{width: '100px', height: '34px'}}
              className="graph-button"
              onClick={this.addGraph.bind(this)}>
              Add Graph
            </button>
          </td>,
          <td key="b_done">
            <button
              style={{width: '100px', height: '34px'}}
              className="graph-button"
              onClick={this.doneEditing.bind(this)}>
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
              onClick={this.deleteDashboard.bind(this)}>
              Delete
            </button>
          </td>,
          <td key="b_edit">
            <button
              style={{width: '80px', height: '34px'}}
              className="graph-button"
              onClick={() => this.setState({editView: true})}>
              Edit
            </button>
          </td>,
          <td key="b_save">
            <button
              style={{width: '100px', height: '34px'}}
              className="graph-button"
              onClick={this.saveDashboards.bind(this)}>
              Save Changes
            </button>
          </td>,
        ];
      }
    }

    return (
      <div>
        <div style={{width: '1000px'}}>
          <Modal
            isOpen={this.state.modalIsOpen}
            onRequestClose={() => this.setState({modalIsOpen: false})}>
            <div style={{width: '1000px'}}>
              <NetworkDashboardStats
                allowCustomTime={false}
                onClose={this.graphEditClose.bind(this)}
                graph={this.state.editedGraph}
                topology={this.props.networkConfig.topology}
              />
            </div>
          </Modal>
        </div>
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
        <ReactGridLayoutWidthProvider
          className="layout"
          layout={layout}
          cols={6}
          rowHeight={150}
          verticalCompact={true}
          onLayoutChange={this.onLayoutChange.bind(this)}>
          {layoutDivs}
        </ReactGridLayoutWidthProvider>
      </div>
    );
  }
}
