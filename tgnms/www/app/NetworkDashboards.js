/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Dispatcher from './NetworkDispatcher.js';
import PlotlyGraph from './PlotlyGraph.js';
import {Actions} from './constants/NetworkConstants.js';
import DashboardSelect from './components/dashboard/DashboardSelect.js';
import GlobalDataSelect from './components/dashboard/GlobalDataSelect.js';
import CreateGraphModal from './components/dashboard/CreateGraphModal.js';
import ReactGridLayout, {WidthProvider} from 'react-grid-layout';
import React from 'react';
import swal from 'sweetalert';
import axios from 'axios';
import moment from 'moment';
import clone from 'lodash-es/clone';

const ReactGridLayoutWidthProvider = WidthProvider(ReactGridLayout);

export default class NetworkDashboards extends React.Component {
  state = {
    dashboards: null,
    editedGraph: null,
    editedGraphIndex: null,
    editView: false,
    graphEditOpen: false,
    hideDashboardOptions: false,
    modalIsOpen: false,
  };

  constructor(props) {
    super(props);
    this.getDashboards = this.getDashboards.bind(this);
    this.getDashboards(this.props.networkConfig.topology.name);
  }

  selectDashboardChange = val => {
    if (val.value === '#New') {
      const {dashboards} = this.state;
      swal(
        {
          animation: 'slide-from-top',
          closeOnConfirm: false,
          inputPlaceholder: 'Dashboard name',
          showCancelButton: true,
          text: 'Enter dashboard name:',
          title: 'Create Dashboard',
          type: 'input',
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
          this.saveDashboards();
          swal('Added!', 'dashboard: ' + inputValue, 'success');
        },
      );
    } else {
      this.props.onHandleSelectedDashboardChange(val.label);
      this.setState({
        editView: false,
      });
    }
  };

  onAddGraphButtonClicked = () => {
    this.setState({
      modalIsOpen: true,
    });
  };

  // startTime and endTime are date objects
  // data is an array of objects containing keys
  // keyIds is an array of key ids
  // setup is an object containing information on type, direction, nodeA, nodeZ, etc
  addGraphCustomTime = (name, startTime, endTime, data, keyIds, setup) => {
    this.setState({editView: true});
    const {dashboards} = this.state;
    const dashboard = dashboards[this.props.selectedDashboard];
    const newGraphs = clone(dashboard.graphs);
    newGraphs.unshift({
      agg_type: 'top',
      container: {
        x: 0,
        y: 0,
        w: 4,
        h: 4,
      },
      data,
      endTime,
      key_ids: keyIds,
      name,
      startTime,
      setup,
    });
    dashboard.graphs = newGraphs;
    this.setState({
      dashboards,
    });
  };

  // startTime and endTime are date objects
  // data is an array of objects containing keys
  // keyIds is an array of key ids
  // setup is an object containing information on type, direction, nodeA, nodeZ, etc
  addGraphMinAgo = (name, minAgo, data, keyIds, setup) => {
    this.setState({editView: true});
    const {dashboards} = this.state;
    const dashboard = dashboards[this.props.selectedDashboard];
    const newGraphs = clone(dashboard.graphs);
    newGraphs.unshift({
      agg_type: 'top',
      container: {
        x: 0,
        y: 0,
        w: 4,
        h: 4,
      },
      data,
      key_ids: keyIds,
      minAgo,
      name,
      setup,
    });
    dashboard.graphs = newGraphs;
    this.setState({
      dashboards,
    });
  };

  closeModal = () => {
    this.setState({
      modalIsOpen: false,
    });
  };

  deleteDashboard = () => {
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
        const {dashboards} = this.state;
        delete dashboards[this.props.selectedDashboard];
        this.props.onHandleSelectedDashboardChange(null);
        this.props.setDashboards(dashboards);
        swal('Deleted!', 'The selected dashboard was deleted.', 'success');
        this.setState({
          dashboards,
        });
      },
    );
  };

  onDashboardNameChange = () => {
    const {dashboards} = this.state;
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
  };

  getDashboards = topologyName => {
    axios
      .get('/dashboards/get/' + topologyName)
      .then(response =>
        this.setState({
          dashboards: response.data,
          editView: false,
        }),
      )
      .catch(err => {
        console.error('Error getting dashboards', err);
        this.setState({
          dashboards: null,
          editView: false,
        });
      });
  };

  onLayoutChange = layout => {
    const {dashboards} = this.state;
    if (
      dashboards &&
      this.props.selectedDashboard &&
      this.props.selectedDashboard in dashboards
    ) {
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
  };

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

  onEdit = () => {
    this.setState({
      editView: true, // boolean
    });
  };

  onDoneEdit = () => {
    this.setState({
      editView: false, // boolean
    });
  };

  editGraph = index => {
    // TODO Make the separate forms for editing graphs (currently button is not working)
    const {dashboards} = this.state;
    const dashboard = dashboards[this.props.selectedDashboard];
    const graphs = dashboard.graphs;
    this.setState({
      editedGraph: graphs[index],
      editedGraphIndex: index,
      graphEditOpen: true,
      modalIsOpen: true,
    });
  };

  editGraphName = index => {
    const {dashboards} = this.state;
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
        const {dashboards} = this.state;
        // update name
        dashboards[this.props.selectedDashboard].graphs[index].name =
          graph.name;
        this.setState({
          dashboards,
        });
        swal('Renamed', 'The selected dashboard was renamed.', 'success');
        this.saveDashboards();
      },
    );
  };

  deleteGraph = index => {
    const {dashboards} = this.state;
    const dashboard = dashboards[this.props.selectedDashboard];
    const graphs = dashboard.graphs;
    graphs.splice(index, 1);
    this.setState({
      dashboards,
    });
  };

  graphEditClose = graph => {
    const {dashboards} = this.state;
    const dashboard = dashboards[this.props.selectedDashboard];
    const graphs = dashboard.graphs;
    if (graph) {
      graphs[this.state.editedGraphIndex] = graph;
    }
    this.setState({
      dashboards,
      editedGraph: null,
      editedGraphIndex: null,
      graphEditOpen: false,
      modalIsOpen: false,
    });
  };

  saveDashboards = () => {
    axios
      .post('/dashboards/save/', {
        dashboards: this.state.dashboards,
        topologyName: this.props.networkConfig.topology.name,
      })
      .then(response => {
        swal('Saved!', 'Dashboard get saved to server!', 'success');
      })
      .catch(err => {
        console.error('Error saving dashboards', err);
      });
  };

  // nodeA and nodeZ should be objects of nodes from the topology,
  // including name, mac_addr, and other information about the node
  // units of startTime and endTime should be a date object
  onChangeDashboardGlobalData = (endTime, minAgo, nodeA, nodeZ, startTime) => {
    const {dashboards} = this.state;
    const dashboard = dashboards[this.props.selectedDashboard];

    const newDashboard = {
      ...dashboard,
      nodeA,
      nodeZ,
      startTime,
      endTime,
      minAgo,
    };

    const {graphs} = newDashboard;
    const newGraphs = graphs.map(graph => {
      if (graph.setup.graphType === 'link') {
        console.log(graph.data)
        this.getLinkKeysData(graph.data[0].key, nodeA, nodeZ, this.props.networkConfig.topology.name, graph.setup.direction)
      }
      return {
        ...graph,
        startTime,
        endTime,
        minAgo
      }
    });

    newDashboard.graphs = newGraphs;
    dashboards[this.props.selectedDashboard] = newDashboard;

    this.setState({
      dashboards,
    });
  };

  getLinkKeysData(key, nodeA, nodeZ, topologyName, direction) {
    if (direction.includes('Z -> A')) {
      const temp = nodeA;
      nodeA = nodeZ;
      nodeZ = temp;
    }
    let formattedKey = 'tgf.' + nodeZ.mac_addr + '.' + key.slice(22);
    let graphName = direction + ' : ' + key.slice(22);

    let url = `/stats_ta/${topologyName}/${formattedKey}`;
    console.log("UERL", url)

    axios.get(url).then(resp => {
      const keyIds = [];
      const dataResp = [];
      // only doing this because backend doesnt return exact key on search
      // must parse through response manually to get desired key number [#]
      if (key.includes('[')) {
        const keyNum = key.slice(key.indexOf('[') + 1, key.indexOf(']'));
        resp.data.forEach(point => {
          if (point[0].key.includes(keyNum)) {
            point.forEach(val => {
              keyIds.push(val.keyId);
              dataResp.push(val);
            });
          }
        });
      } else {
        resp.data.forEach(point => {
          point.forEach((val, index) => {
            keyIds.push(val.keyId);
            dataResp.push(val);
          });
        });
      }
    });
  }

  generateErrorAlert = errMessage => {
    swal('Error', errMessage, 'error');
  };

  generateGraphGrid() {
    const layout = [];
    const layoutDivs = [];

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
          maxW: 6,
          minH: 3,
          minW: 2,
          static: !this.state.editView,
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
                {/* <button
                  className="graph-button edit-graph-button"
                  onClick={this.editGraph.bind(this, index)}>
                  Edit Graph
                </button> */}
                <button
                  className="graph-button  edit-graph-button"
                  onClick={this.editGraphName.bind(this, index)}>
                  Edit Name
                </button>
                <button
                  className="graph-button  edit-graph-button"
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
    const {selectedDashboard} = this.props;
    const {dashboards} = this.state;
    let dashboard = {};
    if (dashboards && selectedDashboard && selectedDashboard in dashboards) {
      dashboard = dashboards[selectedDashboard];
    }

    let timeWindowStr = '';

    if (dashboard.minAgo) {
      timeWindowStr = dashboard.minAgo + ' Mins Ago';
    } else if (dashboard.startTime && dashboard.endTime) {
      const formattedStart = moment(dashboard.startTime).format(
        'MMMM Do YYYY, h:mm:ss a',
      );
      const formattedEnd = moment(dashboard.endTime).format(
        'MMMM Do YYYY, h:mm:ss a',
      );

      timeWindowStr = 'Start: ' + formattedStart + ' | End: ' + formattedEnd;
    }

    return (
      <div className="network-dashboard">
        {!this.state.hideDashboardOptions ? (
          <div className="dashboard-options">
            <button
              className="hide-button"
              onClick={() => this.setState({hideDashboardOptions: true})}>
              Hide Options
            </button>
            {dashboards &&
              selectedDashboard &&
              selectedDashboard in dashboards && (
                <CreateGraphModal
                  modalIsOpen={this.state.modalIsOpen}
                  dashboard={dashboards[this.props.selectedDashboard]}
                  topologyName={this.props.networkConfig.topology.name}
                  closeModal={this.closeModal}
                  onSubmitNewGraph={this.onSubmitNewGraph}
                  addGraphToDashboard={this.addGraphToDashboard}
                />
              )}
            <DashboardSelect
              dashboards={dashboards}
              editView={this.state.editView}
              onEdit={this.onEdit}
              onDoneEdit={this.onDoneEdit}
              selectDashboardChange={this.selectDashboardChange}
              saveDashboards={this.saveDashboards}
              onAddGraphButtonClicked={this.onAddGraphButtonClicked}
              deleteDashboard={this.deleteDashboard}
              onDashboardNameChange={this.onDashboardNameChange}
              onHandleSelectedDashboardChange={
                this.props.onHandleSelectedDashboardChange
              }
              selectedDashboard={this.props.selectedDashboard}
              networkConfig={this.props.networkConfig}
            />
            {dashboards &&
              selectedDashboard &&
              dashboards[selectedDashboard] && (
                <GlobalDataSelect
                  allowCustomTime={false}
                  onClose={this.graphEditClose}
                  networkConfig={this.props.networkConfig}
                  // temporarily here, will not be here once graph type forms are created in next task
                  // addLinkGraph={this.addLinkGraph.bind(this)}
                  onChangeDashboardGlobalData={this.onChangeDashboardGlobalData}
                  dashboard={dashboards[selectedDashboard]}
                />
              )}
          </div>
        ) : (
          <div className="info-bar">
            {!(
              dashboards &&
              selectedDashboard &&
              selectedDashboard in dashboards
            ) ? (
              <div className="info-bar-content">
                <p>No Dashboard Selected</p>
              </div>
            ) : (
              <div className="info-bar-content">
                <h4 id="dashboard-name">{selectedDashboard}</h4>
                <p>
                  <strong>Node A:</strong>{' '}
                  {dashboard.nodeA ? dashboard.nodeA.name : 'Not Selected'}
                </p>
                <p>
                  <strong>Node Z:</strong>{' '}
                  {dashboard.nodeZ ? dashboard.nodeZ.name : 'Not Selected'}
                </p>
                <p>
                  <strong>Time Window:</strong> {timeWindowStr}
                </p>
              </div>
            )}
            <button
              className="show-button"
              onClick={() => this.setState({hideDashboardOptions: false})}>
              Show Options
            </button>
          </div>
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
