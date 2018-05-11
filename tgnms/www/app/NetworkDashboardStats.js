import PropTypes from 'prop-types';
import React from "react";
import equals from "equals";
import { render } from "react-dom";
// dispatcher
import { Actions } from "./constants/NetworkConstants.js";
import Dispatcher from "./NetworkDispatcher.js";
import moment from "moment";
// layout components
import { ScaleModal } from "boron";
import { Menu, MenuItem, Token, AsyncTypeahead } from "react-bootstrap-typeahead";
import "react-bootstrap-typeahead/css/Token.css";
import "react-bootstrap-typeahead/css/Typeahead.css";

// time picker
import Datetime from "react-datetime";
import "react-datetime/css/react-datetime.css";

const TIME_PICKER_OPTS = [
  {
    label: "30 Minutes",
    minAgo: 30
  },
  {
    label: "60 Minutes",
    minAgo: 60
  },
  {
    label: "2 Hours",
    minAgo: 60 * 2
  },
  {
    label: "6 Hours",
    minAgo: 60 * 6
  },
  {
    label: "12 Hours",
    minAgo: 60 * 12
  },
  {
    label: "1 Day",
    minAgo: 60 * 24
  },
  {
    label: "3 Days",
    minAgo: 60 * 24 * 3
  }
];

const GRAPH_AGG_OPTS = [
  {
    name: "top",
    title: "Top"
  },
  {
    name: "bottom",
    title: "Bottom"
  },
  {
    name: "avg",
    title: "Avg + Min/Max"
  },
  {
    name: "sum",
    title: "Sum"
  },
  {
    name: "count",
    title: "Count"
  }
  /*  {
    name: 'split',
    title: 'Split',
  },
  {
    name: 'groupby_site',
    title: 'Group By Site',
  },*/
  // group by link
];

const MenuDivider = props => <li className="divider" role="separator" />;
const MenuHeader = props => <li {...props} className="dropdown-header" />;

export default class NetworkDashboardStats extends React.Component {
  state = {
    // type-ahead data
    keyOptions: [],
    // type-ahead graphs
    keysSelected: [],
    // time selection
    useCustomTime: false,
    // simple minutes ago, won't have to adjust the start/end time displayed
    minAgo: 60,
    // specific start+end time, doesn't support 'now' yet
    startTime: new Date(),
    endTime: new Date(),

    graphAggType: "top",
    keyIsLoading: false,
  };

  constructor(props) {
    super(props);
    if (this.props.graph.data.length > 0) {
      this.state.keysSelected = [this.props.graph];
      this.state.minAgo = this.props.graph.min_ago;
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
        // TODO - this needs to be a comparison of topology names in props
        // clear selected data
        this._typeaheadKey.getInstance().clear();
        break;
    }
  }

  metricSelectionChanged(selectedOpts) {
    // update graph options
    this.setState({
      keysSelected: selectedOpts
    });
  }

  isValidStartDate(date) {
    // TODO - more dynamic than one fixed week
    let minDate = moment().subtract(7, "days");
    return date.toDate() >= minDate.toDate() && date.toDate() < new Date();
  }

  isValidEndDate(date) {
    // TODO - more dynamic than one fixed week
    // TODO - this should be more based on the day since that's the main view
    return date.toDate() >= this.state.startTime && date.toDate() <= new Date();
  }

  formatKeyOptions(keyOptions) {
    let retKeys = [];
    keyOptions.forEach(keyList => {
      // aggregate data for this key
      retKeys.push({name: keyList[0].displayName, data: keyList});
    });
    return retKeys;
  }

  renderTypeaheadKeyMenu(option, props, index) {
    return [
      <strong key="name">{option.name}</strong>,
      <div key="data">Nodes: {option.data.length}</div>
    ];
  }

  onClose() {
    // call-back with graph options
    if (this.state.keysSelected.length >= 1) {
      let keyIds = [];
      let dataList = [];
      this.state.keysSelected.forEach(graph => {
        graph.data.forEach(data => {
          dataList.push(data);
          keyIds.push(data.keyId);
        });
      });
      let graphOpts = this.props.graph;
      graphOpts["name"] = this.state.keysSelected.map(key => key.name).join(" / ");
      graphOpts["data"] = dataList;
      graphOpts["key_ids"] = keyIds;
      graphOpts["min_ago"] = this.state.minAgo;
      graphOpts["agg_type"] = this.state.graphAggType;
      graphOpts["type"] = "key_ids";
      this.props.onClose(graphOpts);
    }
  }

  render() {
    // index nodes by name
    let customInputProps = {};
    if (!this.state.useCustomTime) {
      customInputProps = { disabled: true };
    }

    return (
      <div width="800" style={{background: "#fff"}}>
        <AsyncTypeahead
          key="keys"
          labelKey="name"
          multiple
          placeholder="Enter metric/key name"
          ref={ref => (this._typeaheadKey = ref)}
          isLoading={this.state.keyIsLoading}
          onSearch={query => {
            this.setState({keyIsLoading: true, keyOptions: []});
            let taRequest = {
              topologyName: this.props.topology.name,
              input: query
            };
            let statsTaRequest = new Request("/stats_ta/" + this.props.topology.name + '/' + query, {
              credentials: "same-origin"
            });
            fetch(statsTaRequest)
              .then(resp => resp.json())
              .then(json => this.setState({
                keyIsLoading: false,
                keyOptions: this.formatKeyOptions(json),
              }));
          }}
          selected={this.state.keysSelected}
          onChange={this.metricSelectionChanged.bind(this)}
          useCache={false}
          emptyLabel={false}
          filterBy={(opt, txt) => {return true;}}
          renderMenuItemChildren={this.renderTypeaheadKeyMenu.bind(this)}
          options={this.state.keyOptions}
        />
        <span className="graph-opt-title">Time Window</span>
        {TIME_PICKER_OPTS.map(opts => (
          <button
            label={opts.label}
            key={opts.label}
            className={
              !this.state.useCustomTime && opts.minAgo == this.state.minAgo
                ? "graph-button graph-button-selected"
                : "graph-button"
            }
            onClick={clk =>
              this.setState({
                useCustomTime: false,
                minAgo: opts.minAgo
              })
            }
          >
            {opts.label}
          </button>
        ))}
        {this.props.allowCustomTime ? (
          <div>
            <br />
            <span className="graph-opt-title">Custom Time</span>
            <button
              label="Custom"
              key="customButton"
              className={
                this.state.useCustomTime
                  ? "graph-button graph-button-selected"
                  : "graph-button"
              }
              onClick={clk =>
                this.setState({
                  useCustomTime: !this.state.useCustomTime
                })
              }
            >
              Custom
            </button>
            <span className="timeTitle">Start</span>
            <Datetime
              className="timePicker"
              key="startTime"
              inputProps={customInputProps}
              isValidDate={this.isValidStartDate.bind(this)}
              onChange={change => {
                if (typeof change == "object") {
                  this.setState({ startTime: change.toDate() });
                }
              }}
            />
            <span className="timeTitle">End</span>
            <Datetime
              open={false}
              className="timePicker"
              inputProps={customInputProps}
              isValidDate={this.isValidEndDate.bind(this)}
              key="endTime"
              onChange={change => {
                if (typeof change == "object") {
                  this.setState({ endTime: change.toDate() });
                }
              }}
            />
          </div>
        ) : ""}
        <br />
        <span className="graph-opt-title">Graph Aggregation</span>
        {GRAPH_AGG_OPTS.map(opts => (
          <button
            label={opts.name}
            key={opts.name}
            className={
              opts.name == this.state.graphAggType
                ? "graph-button graph-button-selected"
                : "graph-button"
            }
            onClick={clk => this.setState({ graphAggType: opts.name })}
          >
            {opts.title}
          </button>
        ))}
        <button onClick={this.onClose.bind(this)}
                label="Close"
                key="Close"
                className="graph-button" />
      </div>
    );
  }
}
NetworkDashboardStats.propTypes = {
  allowCustomTime: PropTypes.bool.isRequired,
  graph: PropTypes.object.isRequired,
  // call-back to receive the selected options
  onClose: PropTypes.func.isRequired,
  topology: PropTypes.object.isRequired
};
