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
import GraphConfigurationSelect from './components/dashboard/GraphConfigurationSelect.js';
import CreateGraphModal from './components/dashboard/CreateGraphModal.js';
import GraphInformationBox from './components/dashboard/GraphInformationBox.js';
import {
  formatKeyHelper,
  fetchKeyData,
} from './helpers/NetworkDashboardsHelper.js';
import ReactGridLayout, {WidthProvider} from 'react-grid-layout';
import React from 'react';
import swal from 'sweetalert';
import axios from 'axios';
import moment from 'moment';
import {Glyphicon} from 'react-bootstrap';

const ReactGridLayoutWidthProvider = WidthProvider(ReactGridLayout);

export default class NetworkDashboards extends React.Component {
  state = {
    dashboards: null,
    editedGraph: null,
    editedGraphIndex: null,
    editView: false,
    editGraphMode: false,
    hideDashboardOptions: false,
    hideDataSelect: true,
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
      editGraphMode: false,
      modalIsOpen: true,
    });
  };

  addGraphToDashboard = graph => {
    this.setState({editView: true});
    const {dashboards} = this.state;
    const dashboard = dashboards[this.props.selectedDashboard];
    const newGraphs = [graph, ...dashboard.graphs];
    dashboard.graphs = newGraphs;
    this.setState({
      dashboards,
      modalIsOpen: false,
    });
  };

  closeModal = () => {
    this.setState({
      modalIsOpen: false,
    });
  };

  onHideDataSelect = () => {
    this.setState({
      hideDataSelect: true,
    });
  };

  onShowDataSelect = () => {
    this.setState({
      hideDataSelect: false,
    });
  };

  onDeleteDashboard = () => {
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
        this.saveDashboards();
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
      layout.forEach((glayout, index) => {
        const graph = graphs[index];
        graph.container.x = glayout.x;
        graph.container.y = glayout.y;
        graph.container.w = glayout.w;
        graph.container.h = glayout.h;
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

  onEditGraphButtonClicked = index => {
    const {dashboards} = this.state;
    const dashboard = dashboards[this.props.selectedDashboard];
    const graphs = dashboard.graphs;
    this.setState({
      editedGraph: graphs[index],
      editedGraphIndex: index,
      editGraphMode: true,
      modalIsOpen: true,
    });
  };

  onEditGraphName = index => {
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

  onDeleteGraph = index => {
    const {dashboards} = this.state;
    const dashboard = dashboards[this.props.selectedDashboard];
    const graphs = dashboard.graphs;
    graphs.splice(index, 1);
    this.setState({
      dashboards,
    });
  };

  editGraphOnDashboard = graph => {
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
      editGraphMode: false,
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
        swal('Saved!', 'Dashboards are saved to server!', 'success');
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

    // if the user only changed the time, then return the graphs with updated time
    if (
      dashboard.nodeA === undefined ||
      dashboard.nodeZ === undefined ||
      (nodeA.name === dashboard.nodeA.name &&
        nodeZ.name === dashboard.nodeZ.name)
    ) {
      newDashboard.graphs = graphs.map(graph => {
        // If the graph uses custom data (not data from the dashboard's graph
        // config options, then do not modify the graph
        if (graph.setup.isCustom) {
          return {...graph};
        } else {
          return {
            ...graph,
            startTime,
            endTime,
            minAgo,
          };
        }
      });
      this.setState({
        dashboards: {
          ...dashboards,
          [this.props.selectedDashboard]: newDashboard,
        },
      });
      return;
    }

    const globalData = {
      endTime,
      minAgo,
      nodeA,
      nodeZ,
      startTime,
    };

    const graphPromises = graphs.map(async graph => {
      // If the graph is a custom graph (doesnt use data from the dashboard's
      //  graph config options) then do not modify the graph
      if (graph.setup.isCustom) {
        return {...graph};
      } else {
        const inputData = this.getGraphInputData(graph, globalData);
        return await this.generateGraph(graph.setup.graphType, inputData);
      }
    });

    Promise.all(graphPromises).then(graphs => {
      newDashboard.graphs = graphs;
      this.setState({
        dashboards: {
          ...dashboards,
          [this.props.selectedDashboard]: newDashboard,
        },
      });
    });
  };

  getGraphInputData = (graph, graphData) => {
    const {startTime, endTime, minAgo, nodeA, nodeZ} = graphData;
    let inputData = {};
    if (graph.setup.graphType === 'link') {
      const {key} = graph.key_data[0];
      const graphName = `${graph.setup.direction} ${nodeA.name} -> ${
        nodeZ.name
      } : ${formatKeyHelper(key)}`;
      inputData = {
        startTime,
        endTime,
        minAgo,
        nodeA,
        nodeZ,
        container: graph.container,
        direction: graph.setup.direction,
        setup: graph.setup,
        name: graphName,
        key,
      };
    } else if (graph.setup.graphType === 'node') {
      const nodes = [];
      let graphName = '';
      // check which nodes are used in the graph to replace nodes with the
      // corresponding new nodeA and nodeZ
      if (graph.setup.nodes.includes('nodeA')) {
        nodes.push(nodeA);
      } else if (graph.setup.nodes.includes('nodeZ')) {
        nodes.push(nodeZ);
      }

      graphName = nodes.map(node => node.name).join(',');

      // get key names from the graph's data to query backend
      const keys = graph.key_data.map(keyObj => keyObj.key);

      inputData = {
        startTime,
        endTime,
        minAgo,
        nodes,
        keys,
        container: graph.container,
        setup: graph.setup,
        name: graphName,
      };
    } else if (graph.setup.graphType === 'network') {
      inputData = {
        ...graph,
        startTime,
        endTime,
        minAgo,
      };
    }
    return inputData;
  };

  _filterKeysToNodeKeys = (nodes, keyData) => {
    const newKeyData = [];
    nodes.forEach(node => {
      keyData = keyData.filter(keyObj => {
        if (
          (!RegExp('\\d').test(keyObj.key) ||
            keyObj.key.includes('00:00:00:00:00:00')) &&
          keyObj.node === node.mac_addr
        ) {
          newKeyData.push(keyObj);
          return true;
        } else {
          return false;
        }
      });
    });
    return newKeyData;
  };

  generateGraph = async (graphType, inputData) => {
    let queries = [];
    if (graphType === 'network') {
      // Network does not need updated keys on new input data, so return
      // inputData which already contains all necessary graph information
      return inputData;
    } else if (graphType === 'link') {
      let {direction, nodeA, nodeZ, key} = inputData;
      if (direction.includes('Z -> A')) {
        const temp = nodeA;
        nodeA = nodeZ;
        nodeZ = temp;
      }
      const formattedKey = 'tgf.' + nodeZ.mac_addr + '.' + formatKeyHelper(key);
      queries.push(formattedKey);
    } else if (graphType === 'node') {
      queries = inputData.keys;
    }
    return await fetchKeyData(
      queries,
      this.props.networkConfig.topology.name,
    ).then(graphData => {
      let {keyIds, keyData} = graphData;
      const {startTime, endTime, minAgo, name, setup} = inputData;

      // TODO: fix backend so that stats_ta asks for node or link
      // manually filter through keyIds unrelated to the current node
      if (graphType === 'node') {
        const {nodes} = inputData;
        keyData = this._filterKeysToNodeKeys(nodes, keyData);
        keyIds = keyData.map(keyObj => keyObj.keyId);
      }

      const newGraph = {
        agg_type: graphType === 'network' ? inputData.setup.aggType : 'top',
        container: inputData.container || {
          x: 0,
          y: 0,
          w: 4,
          h: 4,
        },
        key_data: keyData,
        key_ids: keyIds,
        endTime,
        minAgo,
        name,
        startTime,
        setup,
      };
      return newGraph;
    });
  };

  // Will generate a new graph object based on graphType and input data and either
  // adds the graph to the dashboard or edits the currently selected graph
  onSubmitGraph = (graphType, inputData, isEditing) => {
    // keys are already retrieved since both node and network forms use
    // typeahead data which fetches keys anyways
    if (graphType === 'node' || graphType === 'network') {
      const {keys, minAgo, name, startTime, endTime, setup} = inputData;
      const keyData = [...keys];
      const keyIds = keys.map(key => key.keyId);

      const newGraph = {
        agg_type: graphType === 'network' ? inputData.setup.aggType : 'top',
        container: {
          x: 0,
          y: 0,
          w: 4,
          h: 4,
        },
        key_data: keyData,
        endTime,
        key_ids: keyIds,
        minAgo,
        name,
        startTime,
        setup,
      };
      if (isEditing) {
        this.editGraphOnDashboard(newGraph);
      } else {
        this.addGraphToDashboard(newGraph);
      }
    } else {
      this.generateGraph(graphType, inputData)
        .then(newGraph => {
          if (isEditing) {
            this.editGraphOnDashboard(newGraph);
          } else {
            this.addGraphToDashboard(newGraph);
          }
        })
        .catch(err => {
          console.error(err);
        });
    }
  };

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
      graphs.forEach((graph, index) => {
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
            <div key={id} className="graph-wrapper">
              <div className="graph-indicators-box">
                {graph.setup.isCustom && (
                  <div className="graph-indicator custom-graph-indicator">
                    custom
                  </div>
                )}
                <div className="graph-indicator graph-type-indicator">
                  {graph.setup.graphType}
                </div>
              </div>
              <PlotlyGraph divkey={id} title={graph.name} options={graph} />
            </div>,
          );
        } else {
          layoutDivs.push(
            <div key={id}>
              <GraphInformationBox
                key={id}
                graph={graph}
                onEditGraphButtonClicked={() =>
                  this.onEditGraphButtonClicked(index)
                }
                onEditGraphName={() => this.onEditGraphName(index)}
                onDeleteGraph={() => this.onDeleteGraph(index)}
              />
            </div>,
          );
        }
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
                  dashboard={dashboard}
                  networkConfig={this.props.networkConfig}
                  closeModal={this.closeModal}
                  onSubmitGraph={this.onSubmitGraph}
                  editGraphMode={this.state.editGraphMode}
                  graphInEditMode={
                    dashboard.graphs[this.state.editedGraphIndex]
                  }
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
              onDeleteGraph={this.onDeleteGraph}
              onDeleteDashboard={this.onDeleteDashboard}
              onDashboardNameChange={this.onDashboardNameChange}
              onHandleSelectedDashboardChange={
                this.props.onHandleSelectedDashboardChange
              }
              selectedDashboard={this.props.selectedDashboard}
              topologyName={this.props.networkConfig.topology.name}
            />
            {dashboards &&
              selectedDashboard &&
              dashboards[selectedDashboard] && (
                <div>
                  {!this.state.hideDataSelect ? (
                    <div id="global-data-select-wrapper">
                      <h4>Graph Configuration Options</h4>
                      <div
                        className="hide-show-icon"
                        onClick={this.onHideDataSelect}
                        role="button">
                        <Glyphicon glyph="chevron-up" />
                      </div>
                      <GraphConfigurationSelect
                        networkConfig={this.props.networkConfig}
                        onChangeDashboardGlobalData={
                          this.onChangeDashboardGlobalData
                        }
                        dashboard={dashboards[selectedDashboard]}
                        globalUse
                      />
                    </div>
                  ) : (
                    <div id="global-data-select-wrapper">
                      <h4>Apply Graph Configuration Options</h4>
                      <div
                        className="hide-show-icon"
                        onClick={this.onShowDataSelect}
                        role="button">
                        <Glyphicon glyph="chevron-down" />
                      </div>
                    </div>
                  )}
                </div>
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
          onLayoutChange={this.onLayoutChange}>
          {grid.layoutDivs}
        </ReactGridLayoutWidthProvider>
      </div>
    );
  }
}
