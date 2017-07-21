import React from 'react';
import equals from 'equals';
// leaflet maps
import { render } from 'react-dom';
// graphs
import ReactMultiGraph from './ReactMultiGraph.js';
// dispatcher
import { Actions } from './NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';
import moment from 'moment';
// layout components
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import { SpringGrid } from 'react-stonecutter';
import { ScaleModal } from 'boron';
import { Menu, MenuItem, Token, Typeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Token.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';

// time picker
import Datetime from 'react-datetime';
import 'react-datetime/css/react-datetime.css';

const TIME_PICKER_OPTS = [
  {
    label: '30 Minutes',
    minAgo: 30,
  },
  {
    label: '60 Minutes',
    minAgo: 60,
  },
  {
    label: '2 Hours',
    minAgo: 60 * 2,
  },
  {
    label: '6 Hours',
    minAgo: 60 * 6,
  },
  {
    label: '12 Hours',
    minAgo: 60 * 12,
  },
  {
    label: '1 Day',
    minAgo: 60 * 24,
  },
  {
    label: '3 Days',
    minAgo: 60 * 24 * 3,
  },
];

const GRAPH_AGG_OPTS = [
  {
    name: 'top',
    title: 'Top',
  },
  {
    name: 'bottom',
    title: 'Bottom',
  },
  {
    name: 'avg',
    title: 'Avg + Min/Max',
  },
  {
    name: 'sum',
    title: 'Sum',
  },
  {
    name: 'count',
    title: 'Count',
  },
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

export default class NetworkStats extends React.Component {
  state = {
    // type-ahead data
    siteMetrics: {},
    keyOptions: [],
    // type-ahead graphs
    nodesSelected: this.renderInitialOptions(),
    keysSelected: [],
    // time selection
    useCustomTime: false,
    // simple minutes ago, won't have to adjust the start/end time displayed
    minAgo: 60,
    // specific start+end time, doesn't support 'now' yet
    startTime: new Date(),
    endTime: new Date(),
    
    graphAggType: 'top',
  }

  constructor(props) {
    super(props);
  }

  componentWillMount() {
    // register to receive topology updates
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
  }

  componentDidMount() {
    this.refreshData();
  }

  shouldComponentUpdate(nextProps, nextState) {
    // check for time differences
    let changed = (this.state.startTime != nextState.startTime ||
                   this.state.endTime != nextState.endTime ||
                   this.state.minAgo != nextState.minAgo ||
                   this.state.graphAggType != nextState.graphAggType ||
                   this.state.useCustomTime != nextState.useCustomTime ||
                   this.state.nodesSelected != nextState.nodesSelected ||
                   this.state.keysSelected != nextState.keysSelected ||
                   !equals(Object.keys(this.state.siteMetrics),
                           Object.keys(nextState.siteMetrics)));
    return changed;
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.networkConfig &&
        this.props.networkConfig.topology &&
        this.props.networkConfig.topology.name &&
        nextProps.networkConfig &&
        nextProps.networkConfig.topology &&
        nextProps.networkConfig.topology.name &&
        (this.props.networkConfig.topology.name !=
         nextProps.networkConfig.topology.name)) {
      this.refreshData();
    }
  }

  refreshData() {
    this.metricRequest = new XMLHttpRequest();
    this.metricRequest.onload = function() {
      if (!this.metricRequest.responseText.length) {
        return;
      }
      try {
        let data = JSON.parse(this.metricRequest.responseText);
        this.setState({
          siteMetrics: data.site_metrics,
          keyOptions: this.getKeyOptions(this.state.nodesSelected,
                                         data.site_metrics),
        });
      } catch (e) {
        console.error('Unable to parse JSON', this.metricRequest);
      }
    }.bind(this);
    try {
      this.metricRequest.open('POST', '/metrics', true);
      let opts = {
        'topology': this.props.networkConfig.topology,
        'minAgo': this.state.minAgo,
      };
      this.metricRequest.send(JSON.stringify(opts));
    } catch (e) {}
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
        this._typeaheadNode.getInstance().clear();
        this._typeaheadKey.getInstance().clear();
        this.setState({
          siteMetrics: {},
        });
        break;
    }
  }

  getNodeData(nodeList) {
    // return a list of node names and macs
    let nodesByName = {};
    this.props.networkConfig.topology.nodes.forEach(node => {
      nodesByName[node.name] = node;
    });
    return nodeList.map(nodeName => {
      return nodesByName[nodeName];
    });
  }

  metricSelectionChanged(selectedOpts) {
    // update graph options
    this.setState({
      keysSelected: selectedOpts,
    });
  }

  nodeSelectionChanged(selectedOpts, siteMetrics) {
    // update site + link metrics
    let keyOptions = this.getKeyOptions(selectedOpts, this.state.siteMetrics);
    // underlying key data may have changed
    let keysSelected = this.state.keysSelected.map(keyOpts => {
      let found = false;
      keyOptions.forEach(newKeyOpts => {
        if (keyOpts.name == newKeyOpts.name) {
          // we need to replace this key
          keyOpts = newKeyOpts;
          found = true;
        }
      });
      return (found ? keyOpts : null);
    }).filter(keyOpts => keyOpts);;
    // restrict metric/key data
    this.setState({
      nodesSelected: selectedOpts,
      keyOptions: keyOptions,
      keysSelected: keysSelected,
    });
    // clear key list
  }

  renderTypeaheadRestrictorMenu(results, menuProps) {
    let i = 0;
    let lastType = '';
    const items = results.map(item => {
      i++;
      if (item.type != lastType) {
        lastType = item.type;
        return [
          <MenuDivider key={"divider" + i} />,
          <MenuHeader key={"header" + i}>{item.type}</MenuHeader>,
          <MenuItem option={item} key={"item" + i}>{item.name}</MenuItem>
        ];
      }
      return [
        <MenuItem option={item} key={"item" + i}>{item.name}</MenuItem>
      ];
    });
    return <Menu {...menuProps}>{items}</Menu>;
  }

  renderTypeaheadKeyMenu(option, props, index) {
    if (option.data.length > 1) {
      return [
        <strong key="name">{option.name}</strong>,
        <div key="data">
          Nodes: {option.data.length}
        </div>
      ];
    }
    return [
      <strong key="name">{option.name}</strong>,
      <div key="data">
        Site: {option.data[0].siteName}
      </div>
    ];
  }

  renderInitialOptions() {
    let restrictor = [''];
    if (NetworkStore.nodeRestrictor.length > 0) {
      restrictor = NetworkStore.nodeRestrictor.split(',');
    }
    // determine initial list
    let nodeOptions = this.renderNodeOptions(restrictor);
    return nodeOptions;
  }

  renderNodeOptions(filter = []) {
    let nodeOptions = [];
    this.props.networkConfig.topology.sites.forEach(site => {
      if (!filter.length || filter.includes(site.name)) {
        nodeOptions.push({
          name: "Site " + site.name,
          type: 'Sites',
          restrictor: {
            siteName: site.name,
          },
        });
      }
    });
    this.props.networkConfig.topology.nodes.map(node => {
      if (!filter.length || filter.includes(node.name)) {
        nodeOptions.push({
          name: node.name,
          type: 'Nodes',
          restrictor: {
            nodeName: node.name,
          },
        });
      }
    });
    this.props.networkConfig.topology.links.map(link => {
      // skip wired links
      if (link.link_type == 2) {
        return;
      }
      if (!filter.length || filter.includes(link.name)) {
        nodeOptions.push({
          name: "Link " + link.a_node_name + " <-> " + link.z_node_name,
          type: 'Links',
          restrictor: {
            linkName: link.name,
          },
        });
      }
    });
    return nodeOptions
  }

  /**
   * Update the key data based on the selected sites/links.
   */
  getKeyOptions(selectedSiteOpts, siteMetrics) {
    let siteNames = [];
    let nodeNames = [];
    let linkNames = [];
    selectedSiteOpts.forEach(opts => {
      if (opts.restrictor.siteName) {
        siteNames.push(opts.restrictor.siteName);
      }
      if (opts.restrictor.nodeName) {
        nodeNames.push(opts.restrictor.nodeName);
      }
      if (opts.restrictor.linkName) {
        linkNames.push(opts.restrictor.linkName);
      }
    });
    let uniqMetricNames = {};
    let priorityMetricNames = {};
    let restrictionsPresent = siteNames.length || nodeNames.length || linkNames.length;
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
          if (restrictionsPresent && !includeAllSiteMetrics && !includeAllNodeMetrics &&
              !(linkNames.length && metric.linkName && linkNames.includes(metric.linkName))) {
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
            displayName: metric.displayName ? metric.displayName : '',
            linkName: metric.linkName ? metric.linkName : '',
            title: metric.title,
            description: metric.description,
          };
          if (metric.linkTitleAppend) {
            rowData['linkTitleAppend'] =  metric.linkTitleAppend;
          }
          if (metric.displayName) {
            if (!(newKey in priorityMetricNames)) {
              priorityMetricNames[newKey] = [];
            }
            priorityMetricNames[newKey].push(rowData);
          } else {
            if (!(newKey in uniqMetricNames)) {
              uniqMetricNames[newKey] = [];
            }
            uniqMetricNames[newKey].push(rowData);
          }
        });
      });
      // add one entry for each metric name (or full key name)
    });
    let keyOptions = [];
    Object.keys(priorityMetricNames).forEach(metricName => {
      let metrics = priorityMetricNames[metricName];
      keyOptions.push({
        name: metricName,
        data: metrics,
      });
    });
    Object.keys(uniqMetricNames).forEach(metricName => {
      let metrics = uniqMetricNames[metricName];
      keyOptions.push({
        name: metricName,
        data: metrics,
      });
    });
    return keyOptions;
  }

  isValidStartDate(date) {
    // TODO - more dynamic than one fixed week
    let minDate = moment().subtract(7, 'days');
    return (date.toDate() >= minDate.toDate() && date.toDate() < new Date());
  }

  isValidEndDate(date) {
    // TODO - more dynamic than one fixed week
    // TODO - this should be more based on the day since that's the main view
    return (date.toDate() >= this.state.startTime &&
            date.toDate() <= new Date());
  }

  render() {
    let gridComponents = [];
    let graphOptions = [];
    // index nodes by name
    let nodeMacList = [];
    let nodeNameList = [];
    Object.keys(this.props.networkConfig.topology.nodes).map(nodeIndex => {
      let node = this.props.networkConfig.topology.nodes[nodeIndex];
      nodeMacList.push(node.mac_addr);
      nodeNameList.push(node.name);
    });
    let nodeMacListStr = nodeMacList.join(",");
    // nodes list
    let nodes = {};
    this.props.networkConfig.topology.nodes.forEach(node => {
      nodes[node.mac_addr] = {
        'name':     node.name,
        'version':  'Unknown',
      };
    });
    // index nodes
    let nodesByName = {};
    this.props.networkConfig.topology.nodes.forEach(node => {
      nodesByName[node.name] = {
        name: node.name,
        mac_addr: node.mac_addr,
        site_name: node.site_name,
      };
    });
    // construct links
    let links = {};
    let linkRows = [];
    this.props.networkConfig.topology.links.forEach(link => {
      // skipped wired links
      if (link.link_type == 2) {
        return;
      }
      linkRows.push({
        name: link.name,
      });
      links[link.name] = {
        'a_node': {
          'name': link.a_node_name,
          'mac':  nodesByName[link.a_node_name].mac_addr,
        },
        'z_node': {
          'name': link.z_node_name,
          'mac':  nodesByName[link.z_node_name].mac_addr,
        },
      };
    });
    // add the list of node restrictors
    let nodeOptions = this.renderNodeOptions();
    // all graphs
    let pos = 0;
    let multiGraphs = this.state.keysSelected.map(keyIds => {
      let graphOpts = {
        type: 'key_ids',
        key_ids: keyIds.data.map(data => data.keyId),
        data: keyIds.data,
        agg_type: this.state.graphAggType,
      };
      if (this.state.useCustomTime) {
        graphOpts['start_ts'] = this.state.startTime.getTime() / 1000;
        graphOpts['end_ts'] = this.state.endTime.getTime() / 1000;
      } else {
        graphOpts['min_ago'] = this.state.minAgo;
      }
      pos++;
      return (
        <ReactMultiGraph
          options={[graphOpts]}
          key={pos}
          size="large"/>
      );
    });
    // custom time selector
    let customInputProps = {};
    if (!this.state.useCustomTime) {
      customInputProps = {disabled: true};
    }
    return (
      <div width="800">
        <Typeahead
          key="nodes"
          labelKey="name"
          multiple
          options={nodeOptions}
          ref={ref => this._typeaheadNode = ref}
          renderMenu={this.renderTypeaheadRestrictorMenu.bind(this)}
          selected={this.state.nodesSelected}
          paginate={true}
          onChange={this.nodeSelectionChanged.bind(this)}
          placeholder="Node Options"
        />
        <Typeahead
          key="keys"
          labelKey="name"
          multiple
          options={this.state.keyOptions}
          ref={ref => this._typeaheadKey = ref}
          renderMenuItemChildren={this.renderTypeaheadKeyMenu.bind(this)}
          selected={this.state.keysSelected}
          paginate={true}
          onChange={this.metricSelectionChanged.bind(this)}
          placeholder="Enter metric/key name"
        />
        <span className="graph-opt-title">Time Window</span>
        {TIME_PICKER_OPTS.map(opts =>
          <button
              label={opts.label}
              key={opts.label}
              className={(!this.state.useCustomTime &&
                          opts.minAgo == this.state.minAgo) ?
                        "graph-button graph-button-selected" :
                        "graph-button"}
              onClick={clk => this.setState({useCustomTime: false,
                                             minAgo: opts.minAgo})}>
            {opts.label}
          </button>
        )}
        <br />
        <span className="graph-opt-title">Custom Time</span>
        <button
            label="Custom"
            key="customButton"
            className={this.state.useCustomTime ?
                      "graph-button graph-button-selected" :
                      "graph-button"}
            onClick={clk => this.setState({
                useCustomTime: !this.state.useCustomTime})}>
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
              this.setState({startTime: change.toDate()});
            }
          }}/>
        <span className="timeTitle">End</span>
        <Datetime
          open={false}
          className="timePicker"
          inputProps={customInputProps}
          isValidDate={this.isValidEndDate.bind(this)}
          key="endTime"
          onChange={change => {
            if (typeof change == "object") {
              this.setState({endTime: change.toDate()});
            }
          }}/>
        <br />
        <span className="graph-opt-title">Graph Aggregation</span>
        {GRAPH_AGG_OPTS.map(opts =>
          <button
              label={opts.name}
              key={opts.name}
              className={opts.name == this.state.graphAggType ?
                        "graph-button graph-button-selected" :
                        "graph-button"}
              onClick={clk => this.setState({graphAggType: opts.name})}>
            {opts.title}
          </button>
        )}
        {multiGraphs}
      </div>
    );
  }
}
