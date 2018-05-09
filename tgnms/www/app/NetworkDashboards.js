import React from "react";
import { render } from "react-dom";
import { Actions } from "./constants/NetworkConstants.js";
import Dispatcher from "./NetworkDispatcher.js";
import NetworkStore from "./stores/NetworkStore.js";
import ReactGridLayout, { WidthProvider } from "react-grid-layout";
import Select from "react-select";
import { ScaleModal } from "boron";
import NetworkDashboardStats from "./NetworkDashboardStats.js";
import ReactDyGraph from "./ReactDyGraph.js";
import swal from "sweetalert";

const ReactGridLayoutWidthProvider = WidthProvider(ReactGridLayout);

export default class NetworkDashboards extends React.Component {
  state = {
    editView: false,
    selectedDashboard: null,
    dashboards: null,
    graphEditOpen: false,
    editedGraph: null,
    editedGraphIndex: null,
  };

  constructor(props) {
    super(props);
    this.getDashboards = this.getDashboards.bind(this);
    this.getDashboards(this.props.networkConfig.topology.name);
  }

  getDashboards(topologyName) {
    let getDashboards = new Request("/dashboards/get/" + topologyName, {
      credentials: "same-origin"
    });
    fetch(getDashboards).then(
      function(response) {
        if (response.status == 200) {
          response.json().then(
            function(json) {
              this.setState({
                dashboards: json,
                selectedDashboard: null,
                editView: false
              });
            }.bind(this)
          );
        }
      }.bind(this)
    );
  }

  onLayoutChange(layout) {
    let dashboards = this.state.dashboards;
    if (dashboards && this.state.selectedDashboard)  {
      let dashboard = dashboards[this.state.selectedDashboard];
      let graphs = dashboard.graphs;
      let index = 0;
      layout.forEach(glayout => {
        let graph = graphs[index];
        graph.container.x = glayout.x;
        graph.container.y = glayout.y;
        graph.container.w = glayout.w;
        graph.container.h = glayout.h;
        index++;
      });
      this.setState({
        dashboards: dashboards
      });
    }
  }

  componentWillMount() {
    // register to receive topology updates
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this)
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
    if (val.value == "#New") {
      let dashboards = this.state.dashboards;
      swal(
        {
          title: "Create Dashboard",
          text: "Enter dashboard name:",
          type: "input",
          showCancelButton: true,
          closeOnConfirm: false,
          animation: "slide-from-top",
          inputPlaceholder: "Dashboard name"
        },
        function(inputValue) {
          if (inputValue === false) return false;

          if (inputValue === "") {
            swal.showInputError("You need to write something!");
            return false;
          }
          if (dashboards[inputValue]) {
            swal.showInputError("Name Already exists");
            return false;
          }
          dashboards[inputValue] = { graphs: [] };
          this.setState({
            dashboards: dashboards,
            selectedDashboard: inputValue,
            editView: false
          });
          swal("Added!", "dashboard: " + inputValue, "success");
        }.bind(this)
      );
    } else {
      this.setState({
        selectedDashboard: val.label,
        editView: false
      });
    }
  }

  doneEditing() {
    this.setState({
      editView: false
    });
  }

  addGraph() {
    let dashboards = this.state.dashboards;
    let dashboard = dashboards[this.state.selectedDashboard];
    let graphs = dashboard.graphs;
    graphs.push({
      name: "Graph Name",
      min_ago: 30,
      agg_type: "top",
      key_ids: [],
      data: [],
      container: {
        x: 0,
        y: Infinity,
        w: 3,
        h: 3
      }
    });
    this.setState({
      dashboards: dashboards
    });
  }

  editGraph(index) {
    let dashboards = this.state.dashboards;
    let dashboard = dashboards[this.state.selectedDashboard];
    let graphs = dashboard.graphs;
    this.setState({
      graphEditOpen: true,
      editedGraph: graphs[index],
      editedGraphIndex: index
    });
    this.refs.stats_ta.show();
  }

  editGraphName(index) {
    let dashboards = this.state.dashboards;
    let dashboard = dashboards[this.state.selectedDashboard];
    let graph = dashboard.graphs[index];
    swal(
      {
        title: "New name",
        type: "input",
        inputValue: graph.name,
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Rename",
        closeOnConfirm: false
      },
      function(value) {
        let dashboards = this.state.dashboards;
        // update name
        dashboards[this.state.selectedDashboard].graphs[index].name = value;
        this.setState({
          dashboards: dashboards,
        });
        swal("Renamed", "The selected dashboard was renamed.", "success");
        this.saveDashboards();
      }.bind(this)
    );
  }

  graphEditClose(graph) {
    this.refs.stats_ta.hide();
    let dashboards = this.state.dashboards;
    let dashboard = dashboards[this.state.selectedDashboard];
    let graphs = dashboard.graphs;
    if (graph) {
      graphs[this.state.editedGraphIndex] = graph;
    }
    this.setState({
      graphEditOpen: false,
      dashboards: dashboards,
      editedGraph: null,
      editedGraphIndex: null
    });
  }

  deleteGraph(index) {
    let dashboards = this.state.dashboards;
    let dashboard = dashboards[this.state.selectedDashboard];
    let graphs = dashboard.graphs;
    graphs.splice(index, 1);
    this.setState({
      dashboards: dashboards
    });
  }

  deleteDashboard() {
    swal(
      {
        title: "Are you sure?",
        text: "This will delete the dashboard: " + this.state.selectedDashboard,
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Yes, do it!",
        closeOnConfirm: false
      },
      function() {
        let dashboards = this.state.dashboards;
        delete dashboards[this.state.selectedDashboard];
        this.setState({
          dashboards: dashboards,
          selectedDashboard: null
        });
        swal("Deleted!", "The selected dashboard was deleted.", "success");
        this.saveDashboards();
      }.bind(this)
    );
  }

  saveDashboards() {
    this.saveDashboardsRequest = new XMLHttpRequest();
    this.saveDashboardsRequest.onload = function() {
      if (!this.saveDashboardsRequest) {
        return;
      }
      swal("Saved!", "Dashboard get saved to server!", "success");
    }.bind(this);
    try {
      this.saveDashboardsRequest.open("POST", "/dashboards/save/", true);
      let data = {
        dashboards: this.state.dashboards,
        topologyName: this.props.networkConfig.topology.name
      };
      this.saveDashboardsRequest.send(JSON.stringify(data));
    } catch (e) {}
  }

  onDashboardNameChange() {
    let dashboards = this.state.dashboards;
    swal(
      {
        title: "Dashboard Name",
        text: "Enter dashboard name:",
        type: "input",
        inputValue: this.state.selectedDashboard,
        showCancelButton: true,
        closeOnConfirm: false,
        animation: "slide-from-top",
        inputPlaceholder: "Write something"
      },
      function(inputValue) {
        if (inputValue === false) return false;
        if (inputValue === "") {
          swal.showInputError("You need to write something!");
          return false;
        }
        if (
          inputValue != this.state.selectedDashboard &&
          dashboards[inputValue]
        ) {
          swal.showInputError("Name Already exists");
          return false;
        }
        dashboards[inputValue] = dashboards[this.state.selectedDashboard];
        delete dashboards[this.state.selectedDashboard];
        this.setState({
          dashboards: dashboards,
          selectedDashboard: inputValue
        });
        swal(
          "Dashboard Name Chnaged!",
          "New dashboard name is: " + inputValue,
          "success"
        );
      }.bind(this)
    );
  }

  render() {
    var layout = [];
    var layoutDivs = [];

    if (
      this.state.dashboards &&
      this.state.selectedDashboard
    ) {
      let dashboard = this.state.dashboards[this.state.selectedDashboard];
      let graphs = dashboard.graphs;
      var index = 0;
      graphs.forEach(graph => {
        let id = "graph" + index.toString();
        layout.push({
          i: id,
          x: graph.container.x,
          y: graph.container.y,
          w: graph.container.w,
          h: graph.container.h,
          static: this.state.editView ? false : true
        });
        if (!this.state.editView) {
          layoutDivs.push(
            <div key={id}>
              <ReactDyGraph
                divkey={id + "dy"}
                title={graph.name}
                options={graph}
              />
            </div>
          );
        } else {
          layoutDivs.push(
            <div key={id}>
              <div>
                {graph.name}
                <button
                  style={{ width: "100px", height: "34px", float: "right" }}
                  className="graph-button"
                  onClick={this.editGraph.bind(this, index)}
                >
                  Edit Graph
                </button>
                <button
                  style={{ width: "100px", height: "34px", float: "right" }}
                  className="graph-button"
                  onClick={this.editGraphName.bind(this, index)}
                >
                  Edit Name
                </button>
                <button
                  style={{ width: "100px", height: "34px", float: "right" }}
                  className="graph-button"
                  onClick={this.deleteGraph.bind(this, index)}
                >
                  Delete Graph
                </button>
              </div>
            </div>
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
          label: dashboardName
        });
      });
      dashboardsOptions.push({
        value: "#New",
        label: "New Dashboard ..."
      });
    }

    let topButtons = [];
    let selector = (
      <td width={310}>
        <div style={{ width: 300 }}>
          <Select
            options={dashboardsOptions}
            name="Select Dashboard"
            placeholder="Select Dashboard"
            value={this.state.selectedDashboard}
            onChange={this.selectDashboardChange.bind(this)}
            clearable={false}
          />
        </div>
      </td>
    );
    if (this.state.selectedDashboard) {
      if (this.state.editView) {
        selector = (
          <td width={330} key="b_name">
            <button
              style={{ width: "300px", height: "34px" }}
              className="graph-button"
              onClick={this.onDashboardNameChange.bind(this)}
            >
              {this.state.selectedDashboard}
            </button>
          </td>
        );
        topButtons = [
          <td key="b_add">
            <button
              style={{ width: "100px", height: "34px" }}
              className="graph-button"
              onClick={this.addGraph.bind(this)}
            >
              Add Graph
            </button>
          </td>,
          <td key="b_done">
            <button
              style={{ width: "100px", height: "34px" }}
              className="graph-button"
              onClick={this.doneEditing.bind(this)}
            >
              Done Editing
            </button>
          </td>
        ];
      } else {
        topButtons = [
          <td key="b_delete">
            <button
              style={{ width: "80px", height: "34px" }}
              className="graph-button"
              onClick={this.deleteDashboard.bind(this)}
            >
              Delete
            </button>
          </td>,
          <td key="b_edit">
            <button
              style={{ width: "80px", height: "34px" }}
              className="graph-button"
              onClick={() => this.setState({ editView: true })}
            >
              Edit
            </button>
          </td>,
          <td key="b_save">
            <button
              style={{ width: "100px", height: "34px" }}
              className="graph-button"
              onClick={this.saveDashboards.bind(this)}
            >
              Save Changes
            </button>
          </td>
        ];
      }
    }

    return (
      <div>
        <div style={{width: "1000px"}}>
          <ScaleModal ref="stats_ta">
            <div style={{width: "1000px"}}>
              <NetworkDashboardStats
                allowCustomTime={false}
                onClose={this.graphEditClose.bind(this)}
                graph={this.state.editedGraph}
                topology={this.props.networkConfig.topology}
              />
            </div>
          </ScaleModal>
        </div>
        <table
          style={{borderCollapse: "separate", borderSpacing: "5px 5px", display: "block", width: "100px"}}
        >
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
          cols={12}
          rowHeight={100}
          verticalCompact={true}
          onLayoutChange={this.onLayoutChange.bind(this)}
        >
          {layoutDivs}
        </ReactGridLayoutWidthProvider>
      </div>
    );
  }
}
