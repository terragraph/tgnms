import React from "react";
import { render } from "react-dom";
import { Actions } from "./constants/NetworkConstants.js";
import Dispatcher from "./NetworkDispatcher.js";
import NetworkStore from "./stores/NetworkStore.js";
import ReactGridLayout, { WidthProvider } from "react-grid-layout";
const ReactGridLayoutWidthProvider = WidthProvider(ReactGridLayout);
import Select from "react-select";
import NetworkStats from "./NetworkStats.js";
import ReactDyGraph from "./ReactDyGraph.js";

export default class NetworkDashboards extends React.Component {
  state = {
    editView: false,
    selectedDashboard: null,
    dashboards: null,
    graphEditOpen: false,
    editedGraph: null,
    editedGraphIndex: null,
    siteMetrics: null
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
    if (dashboards && this.state.selectedDashboard) {
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

  componentDidMount() {
    this.refreshKeys();
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
    clearInterval(this.timer);
  }

  getGraphOptions(
    selectedSiteOpts,
    selectedKeys,
    timeframe,
    aggregation,
    siteMetrics
  ) {
    let siteNames = [];
    let nodeNames = [];
    let linkNames = [];
    selectedSiteOpts.forEach(opts => {
      if (opts.type == "Site") {
        siteNames.push(opts.id);
      }
      if (opts.type == "Node") {
        nodeNames.push(opts.id);
      }
      if (opts.type == "Link") {
        linkNames.push(opts.id);
      }
    });
    let uniqMetricNames = {};
    let restrictionsPresent =
      siteNames.length || nodeNames.length || linkNames.length;
    // iterate all options/keys
    Object.keys(siteMetrics).forEach(siteName => {
      let nodeMetrics = siteMetrics[siteName];
      let includeAllSiteMetrics = false;
      if (siteNames.length && siteNames.includes(siteName)) {
        includeAllSiteMetrics = true;
      }
      Object.keys(nodeMetrics).forEach(nodeName => {
        let metrics = nodeMetrics[nodeName];
        let includeAllNodeMetrics = false;
        if (nodeNames.length && nodeNames.includes(nodeName)) {
          includeAllNodeMetrics = true;
        }
        Object.keys(metrics).forEach(metricName => {
          let metric = metrics[metricName];
          if (
            restrictionsPresent &&
            !includeAllSiteMetrics &&
            !includeAllNodeMetrics &&
            !(
              linkNames.length &&
              metric.linkName &&
              linkNames.includes(metric.linkName)
            )
          ) {
            return;
          }
          let newKey = metric.displayName ? metric.displayName : metricName;
          // TODO - fix this plz..
          let rowData = {
            key: newKey,
            node: nodeName,
            keyId: metric.dbKeyId,
            nodeName: nodeName,
            siteName: siteName,
            displayName: metric.displayName ? metric.displayName : "",
            linkName: metric.linkName ? metric.linkName : "",
            title: metric.title,
            description: metric.description
          };
          if (metric.linkTitleAppend) {
            rowData["linkTitleAppend"] = metric.linkTitleAppend;
          }
          if (!(newKey in uniqMetricNames)) {
            uniqMetricNames[newKey] = [];
          }
          uniqMetricNames[newKey].push(rowData);
        });
      });
      // add one entry for each metric name (or full key name)
    });

    let keys = [];
    selectedKeys.forEach(key => {
      if (uniqMetricNames[key.name]) {
        keys.push.apply(keys, uniqMetricNames[key.name]);
      }
    });

    let graphOpts = {
      type: "key_ids",
      key_ids: keys.map(data => data.keyId),
      data: keys,
      min_ago: timeframe,
      agg_type: aggregation
    };
    return graphOpts;
  }

  refreshKeys() {
    this.metricRequest = new XMLHttpRequest();
    this.metricRequest.onload = function() {
      if (!this.metricRequest.responseText.length) {
        return;
      }
      try {
        let data = JSON.parse(this.metricRequest.responseText);
        this.setState({
          siteMetrics: data.site_metrics
        });
      } catch (e) {
        console.error("Unable to parse JSON", this.metricRequest);
        this.setState({
          siteMetrics: null
        });
      }
    }.bind(this);
    try {
      this.metricRequest.open("POST", "/metrics", true);
      let opts = {
        topology: this.props.networkConfig.topology,
        minAgo: 60 * 24
      };
      this.metricRequest.send(JSON.stringify(opts));
    } catch (e) {}
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_SELECTED:
        this.getDashboards(payload.networkName);
      case Actions.TOPOLOGY_REFRESHED:
        this.refreshKeys();
        break;
    }
  }

  selectDashboardChange(val) {
    if (val.value == "#New") {
      let dashboards = this.state.dashboards;
      swal(
        {
          title: "New Dashboard!",
          text: "Enter dashboard name:",
          type: "input",
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
      timeframe: 30,
      aggregation: "top",
      selectedNodes: "",
      selectedKeys: "",
      nodes: [],
      keys: [],
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
  }

  graphEditClose(graph) {
    let dashboards = this.state.dashboards;
    let dashboard = dashboards[this.state.selectedDashboard];
    let graphs = dashboard.graphs;
    if (graph) {
      graphs[this.state.editedGraphIndex].name = graph.name;
      graphs[this.state.editedGraphIndex].nodes = graph.nodes;
      graphs[this.state.editedGraphIndex].keys = graph.keys;
      graphs[this.state.editedGraphIndex].timeframe = graph.timeframe;
      graphs[this.state.editedGraphIndex].aggregation = graph.aggregation;
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
      this.state.selectedDashboard &&
      this.state.siteMetrics
    ) {
      let dashboard = this.state.dashboards[this.state.selectedDashboard];
      let graphs = dashboard.graphs;
      var index = 0;
      graphs.forEach(graph => {
        let id = "graph" + index.toString();
        let options = [];
        options.push(
          this.getGraphOptions(
            graph.nodes,
            graph.keys,
            graph.timeframe,
            graph.aggregation,
            this.state.siteMetrics
          )
        );
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
                options={options}
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
      <div style={{ width: "100%", float: "left" }}>
        {this.state.graphEditOpen ? (
          <NetworkStats
            isOpen={this.state.graphEditOpen}
            onClose={this.graphEditClose.bind(this)}
            {...this.props}
            siteMetrics={this.state.siteMetrics}
            graph={this.state.editedGraph}
          />
        ) : (
          <div />
        )}

        <table
          style={{ borderCollapse: "separate", borderSpacing: "15px 5px" }}
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
