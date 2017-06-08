import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';
import { Menu, MenuItem, Token, Typeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Token.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';

const customModalStyle = {
  content : {
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)',
    height                : '60%'
  }
};

const TIME_PICKER_OPTS = [
  {
    label: '30m',
    minAgo: 30,
  },
  {
    label: '60m',
    minAgo: 60,
  },
  {
    label: '3h',
    minAgo: 60 * 3,
  },
  {
    label: '6h',
    minAgo: 60 * 6,
  },
  {
    label: '12h',
    minAgo: 60 * 12,
  },
  {
    label: '1d',
    minAgo: 60 * 24,
  },
  {
    label: '3d',
    minAgo: 60 * 24 * 3,
  },
  {
    label: '1w',
    minAgo: 60 * 24 * 7,
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
  {
    name: 'none',
    title: 'None',
  }
];

const MenuDivider = props => <li className="divider" role="separator" />;
const MenuHeader = props => <li {...props} className="dropdown-header" />;

export default class ModalGraphEdit extends React.Component {
  state = {
    keyOptions: [],
    // type-ahead graphs
    nodesSelected: [],
    keysSelected: [],
  }

  componentDidMount() {
    let nodesSelected = [];
    let keysSelected = [];
    if (this.props.graph) {
      this.props.graph.nodes.forEach(node => {
        nodesSelected.push({
          "name": node.name,
          "id": node.id,
          "type": node.type
        });
      });
      this.props.graph.keys.forEach(key => {
        keysSelected.push({
          "name": key.name
        });
      });
      this.setState({
        graphName: this.props.graph.name,
        nodesSelected: nodesSelected,
        keysSelected: keysSelected,
        minAgo: this.props.graph.timeframe,
        graphAggType: this.props.graph.aggregation
      });
    }
  }

  modalClose(save) {
    if (save) {
      let graph = {};
      graph.name = this.state.graphName;
      graph.nodes = this.state.nodesSelected;
      graph.keys = [];
      this.state.keysSelected.forEach(key => {
        graph.keys.push({name: key.name});
      });
      graph.timeframe = this.state.minAgo;
      graph.aggregation = this.state.graphAggType;
      this.props.onClose(graph);
    } else {
      this.props.onClose();
    }
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

  renderNodeOptions() {
    let nodeOptions = this.props.networkConfig.topology.sites.map(site => {
      return {
        name: "Site " + site.name,
        type: 'Site',
        id: site.name,
      };
    });

    this.props.networkConfig.topology.nodes.map(node => {
      nodeOptions.push({
        name: node.name,
        type: 'Node',
        id: node.name,
      });
    });

    this.props.networkConfig.topology.links.map(link => {
      // skip wired links
      if (link.link_type == 2) {
        return;
      }
      nodeOptions.push({
        name: "Link " + link.a_node_name + " <-> " + link.z_node_name,
        type: 'Link',
        id: link.name,
      });
    });
    return nodeOptions
  }

  nodeSelectionChanged(selectedOpts) {
    // update site + link metrics
    let keyOptions = this.getKeyOptions(selectedOpts, this.props.siteMetrics);
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

  renderTypeaheadKeyMenu(option, props, index) {
    return [
      <strong key="name">{option.name}</strong>,
      <span> (Nodes: {option.data.length}) </span>
    ];
  }

  metricSelectionChanged(selectedOpts) {
    // update graph options
    this.setState({
      keysSelected: selectedOpts,
    });
  }

  getKeyOptions(selectedSiteOpts, siteMetrics) {
    if (!siteMetrics) {
      return [];
    }

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

  render() {
    let nodeOptions = this.renderNodeOptions();
    let keyOptions = this.getKeyOptions(this.state.nodesSelected,
                                   this.props.siteMetrics);
    return (
      <Modal
          isOpen={this.props.isOpen}
          onRequestClose={this.modalClose.bind(this, false)}
          style={customModalStyle}
          contentLabel="Example Modal">
          <div width="800" height="800">
            <span className="graph-opt-title">Graph Name</span>
            <input style={{'width': '300px', 'height': '34px'}} type="text" value={this.state.graphName} onChange={(event) => this.setState({graphName: event.target.value})} />
            <br />
            <br />
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
            <br />
            <Typeahead
              key="keys"
              labelKey="name"
              multiple
              options={keyOptions}
              ref={ref => this._typeaheadKey = ref}
              renderMenuItemChildren={this.renderTypeaheadKeyMenu.bind(this)}
              selected={this.state.keysSelected}
              paginate={true}
              onChange={this.metricSelectionChanged.bind(this)}
              placeholder="Enter metric/key name"
            />
            <br />
            <span className="graph-opt-title">Time Window</span>
            {TIME_PICKER_OPTS.map(opts =>
              <button
                  label={opts.label}
                  key={opts.label}
                  style={{'width': '50px'}}
                  className={opts.minAgo == this.state.minAgo ?
                            "graph-button graph-button-selected" :
                            "graph-button"}
                  onClick={clk => this.setState({minAgo: opts.minAgo})}>
                {opts.label}
              </button>
            )}
            <br />
            <span className="graph-opt-title">Graph Aggregation</span>
            {GRAPH_AGG_OPTS.map(opts =>
              <button
                  label={opts.name}
                  key={opts.name}
                  style={{'width': '100px'}}
                  className={opts.name == this.state.graphAggType ?
                            "graph-button graph-button-selected" :
                            "graph-button"}
                  onClick={clk => this.setState({graphAggType: opts.name})}>
                {opts.title}
              </button>
            )}
            <br />
            <br />
            <br />
            <button style={{float: 'right', 'width': '80px', 'height': '34px', 'backgroundColor': 'rgb(217, 219, 221)'}} className='graph-button' onClick={this.modalClose.bind(this, true)}>Set</button>
            <button style={{float: 'right', 'width': '80px', 'height': '34px', 'backgroundColor': 'rgb(217, 219, 221)'}} className='graph-button' onClick={this.modalClose.bind(this, false)}>Cancel</button>
          </div>
      </Modal>
    );
  }
}
