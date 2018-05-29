/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Dispatcher from './NetworkDispatcher.js';
import PlotlyGraph from './PlotlyGraph.js';
import {Actions} from './constants/NetworkConstants.js';
import NetworkStore from './stores/NetworkStore.js';
import DashboardSelect from './components/dashboard/DashboardSelect.js';
import NetworkDashboardStats from './NetworkDashboardStats.js';
import GlobalDataSelect from './components/dashboard/GlobalDataSelect.js';
import {render} from 'react-dom';
import ReactGridLayout, {WidthProvider} from 'react-grid-layout';
import Modal from 'react-modal';
import Select from 'react-select';
import React from 'react';
import swal from 'sweetalert';
import axios from 'axios';

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

  selectDashboardChange(val) {
    if (val.value === '#New') {
      const dashboards = this.props.dashboards;
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
        inputValue => {
          if (!inputValue) {
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
            dashboards,
            editView: false,
          });
          swal('Added!', 'dashboard: ' + inputValue, 'success');
        },
      );
    } else {
      this.props.onHandleSelectedDashboardChange(val.label);
      this.setState({
        editView: false,
      });
    }
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
        y: 0,
        w: 3,
        h: 3,
      },
    });
    this.setState({
      dashboards,
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
      () => {
        const dashboards = this.props.dashboards;
        delete dashboards[this.props.selectedDashboard];
        this.props.onHandleSelectedDashboardChange(null);
        this.props.setDashboards(dashboards);
        swal('Deleted!', 'The selected dashboard was deleted.', 'success');
        this.setState({
          dashboards,
        });
      },
    );
  }

  onDashboardNameChange() {
    const dashboards = this.props.dashboards;
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
      inputValue => {
        if (inputValue === false) {
          return false;
        }
        if (inputValue === '') {
          swal.showInputError('You need to write something!');
          return false;
        }
        if (
          inputValue !== this.props.selectedDashboard &&
          dashboards[inputValue]
        ) {
          swal.showInputError('Name Already exists');
          return false;
        }
        dashboards[inputValue] = dashboards[this.props.selectedDashboard];
        delete dashboards[this.props.selectedDashboard];
        this.props.onHandleSelectedDashboardChange(inputValue);
        this.setState({
          dashboards,
        });
        swal(
          'Dashboard Name Chnaged!',
          'New dashboard name is: ' + inputValue,
          'success',
        );
      },
    );
  }

  getDashboards(topologyName) {
    axios
      .get('/dashboards/get/' + topologyName)
      .then(response =>
        this.setState({
          dashboards: response.data,
          editView: false,
        }),
      )
      .catch(err => {
        console.log('Error getting dashboards', err);
        this.setState({
          dashboards: null,
          editView: false,
        });
      });
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
        dashboards,
      });
    }
  }

  componentDidMount() {
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

  onEdit() {
    this.setState({
      editView: true, // boolean
    });
  }

  onDoneEdit() {
    this.setState({
      editView: false, // boolean
    });
  }

  // temporarily here, will not be here once graph type forms are created in next task
  addLinkGraph(name, startTime, endTime, data, keyIds) {
    this.setState({editView: true});
    const dashboards = this.state.dashboards;
    const dashboard = dashboards[this.props.selectedDashboard];
    const graphs = dashboard.graphs;
    graphs.unshift({
      name,
      startTime,
      endTime,
      agg_type: 'top',
      key_ids: keyIds,
      data,
      container: {
        x: 0,
        y: 0,
        w: 4,
        h: 4,
      },
    });
    this.setState({
      dashboards,
    });
  }

  editGraph(index) {
    // TODO Make the separate forms for editing graphs (currently button is not working)
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
      () => {
        const dashboards = this.state.dashboards;
        // update name
        dashboards[this.props.selectedDashboard].graphs[index].name = value;
        this.setState({
          dashboards,
        });
        swal('Renamed', 'The selected dashboard was renamed.', 'success');
        this.saveDashboards();
      },
    );
  }

  deleteGraph(index) {
    const dashboards = this.state.dashboards;
    const dashboard = dashboards[this.props.selectedDashboard];
    const graphs = dashboard.graphs;
    graphs.splice(index, 1);
    this.setState({
      dashboards,
    });
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
      dashboards,
      editedGraph: null,
      editedGraphIndex: null,
      modalIsOpen: false,
    });
  }

  saveDashboards() {
    axios
      .post('/dashboards/save/', {
        dashboards: this.state.dashboards,
        topologyName: this.props.networkConfig.topology.name,
      })
      .then(response => {
        swal('Saved!', 'Dashboard get saved to server!', 'success');
      })
      .catch(err => {
        console.log('Error saving dashboards', err);
      });
  }

  // nodeA and nodeZ should be objects of nodes from the topology, including name, mac_addr, and other information about the node
  // units of startTime and endTime should be a date object
  onChangeDashboardGlobalData(nodeA, nodeZ, startTime, endTime) {
    const dashboard = this.state.dashboards[this.props.selectedDashboard];
    dashboard.nodeA = nodeA;
    dashboard.nodeZ = nodeZ;
    dashboard.startTime = startTime;
    dashboard.endTime = endTime;
  }

  generateGraphGrid() {
    let layout = [];
    let layoutDivs = [];

    if (
      this.state.dashboards &&
      this.state.dashboards[this.props.selectedDashboard]
    ) {
      const dashboard = this.state.dashboards[this.props.selectedDashboard];
      const graphs = dashboard.graphs;
      let index = 0;
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
              <PlotlyGraph divkey={id} title={graph.name} options={graph} />
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
    return {
      layout,
      layoutDivs,
    };
  }

  render() {
    const grid = this.generateGraphGrid();

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
        <DashboardSelect
          dashboards={this.state.dashboards}
          editView={this.state.editView}
          onEdit={this.onEdit.bind(this)}
          onDoneEdit={this.onDoneEdit.bind(this)}
          selectDashboardChange={this.selectDashboardChange.bind(this)}
          saveDashboards={this.saveDashboards.bind(this)}
          addGraph={this.addGraph.bind(this)}
          deleteDashboard={this.deleteDashboard.bind(this)}
          onHandleSelectedDashboardChange={this.props.onHandleSelectedDashboardChange.bind(
            this,
          )}
          selectedDashboard={this.props.selectedDashboard}
          networkConfig={this.props.networkConfig}
        />
        {this.state.dashboards &&
          this.props.selectedDashboard &&
          this.state.dashboards[this.props.selectedDashboard] && (
            <GlobalDataSelect
              allowCustomTime={false}
              onClose={this.graphEditClose.bind(this)}
              networkConfig={this.props.networkConfig}
              // temporarily here, will not be here once graph type forms are created in next task
              addLinkGraph={this.addLinkGraph.bind(this)}
              onChangeDashboardGlobalData={this.onChangeDashboardGlobalData.bind(
                this,
              )}
              dashboard={this.state.dashboards[this.props.selectedDashboard]}
            />
          )}
        <ReactGridLayoutWidthProvider
          className="layout"
          layout={grid.layout}
          cols={6}
          rowHeight={150}
          verticalCompact={true}
          onLayoutChange={this.onLayoutChange.bind(this)}>
          {grid.layoutDivs}
        </ReactGridLayoutWidthProvider>
      </div>
    );
  }
}
