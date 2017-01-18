import React from 'react';
// leaflet maps
import { render } from 'react-dom';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import AsyncButton from 'react-async-button';
import Dropdown from 'react-dropdown'
import NumericInput from 'react-numeric-input';
import Highlighter from 'react-highlight-words'
import styles from '../static/css/Highlighter.css'
import latinize from 'latinize'
import NetworkStore from './NetworkStore.js';

const Spinner = () => (
  <div className='spinner'>
    <div className='double-bounce1'></div>
    <div className='double-bounce2'></div>
  </div>
)

export default class SystemLogs extends React.Component {
  state = {
    logSources: [],
    selectedSource: null,
    selectedSourceName: null,
    searchResult: [],
    from: 0,
    size: 2000,
    searchText: "",
    textToHighlight: "",
    networkConfig: undefined,
  }

  constructor(props) {
    super(props);
    this.selectChange = this.selectChange.bind(this);
    this.selectNodeChange = this.selectNodeChange.bind(this);
    this.getConfigs = this.getConfigs.bind(this);
    this.loadClick = this.loadClick.bind(this);
    this.handleSizeChange = this.handleSizeChange.bind(this);
    this.handleFromChange = this.handleFromChange.bind(this);

    this.getConfigs();
  }

  componentWillMount() {
    // register once we're visible
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    // update default state from the store
    if (NetworkStore.networkName && NetworkStore.networkConfig) {
      this.setState({
        networkConfig: NetworkStore.networkConfig,
      });
    }
  }

  componentWillUnmount() {
    // un-register if we're no longer visible
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {

    switch (payload.actionType) {
      case Actions.TOPOLOGY_SELECTED:
        this.setState({
          selectedNodeName: null,
        });
        break;
      case Actions.TOPOLOGY_REFRESHED:
        this.setState({
          networkConfig: payload.networkConfig,
        });
        break;
    }
  }

  getConfigs() {
    let getLogSources = new Request('/elastic/getSystemLogsSources/');
    fetch(getLogSources).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          this.setState({
            logSources: json.sources,
          });
        }.bind(this));
      }
    }.bind(this));
  }

  loadClick(e) {
    if (this.state.selectedNodeMac && this.state.selectedSourceName) {
      return new Promise((resolve, reject) => {
        let exec = new Request('/elastic/getSystemLogs/'+ this.state.selectedSourceName+'/'+this.state.from+'/'+this.state.size+'/'+this.state.selectedNodeMac);
        fetch(exec).then(function(response) {
          if (response.status == 200) {
            response.json().then(function(json) {
              var text = ""
              json.forEach(line => {
                text = line._source.log + "\n" + text;
              });
              this.setState({
                searchResult: json,
                textToHighlight: text,
              });
              resolve();
            }.bind(this));
          } else {
            reject();
          }
        }.bind(this));
      });
    } else {
      alert('Please select a Log source and a Node name!');
    }
  }

  selectChange(val) {
    Object(this.state.logSources).forEach(source => {
      if (source.name == val.value) {
        this.setState({
          selectedSource: source,
          selectedSourceName: val.label,
          searchResult: [],
        });
        return;
      }
    });
  }

  selectNodeChange(val) {
    Object(this.state.networkConfig.topology.nodes).forEach(node => {
      if (node.name == val.value) {
        this.setState({
          selectedNodeMac: node.mac_addr,
          selectedNodeName: val.label,
        });
        return;
      }
    });
  }

  renderLogText(): ReactElement<any> {
    if (this.state.selectedSource && this.state.logSources) {
      const searchWords = this.state.searchText.split(/\s/).filter(word => word)
      return (
        <div>
          <form>
          Search
          <input
                className={styles.Input}
                name='searchTerms'
                value={this.state.searchText}
                size="30" maxLength="100"
                onChange={event => this.setState({ searchText: event.target.value })}
              />
          </form>

          <Highlighter
            activeClassName={styles.Active}
            activeIndex="-1"
            highlightClassName={styles.Highlight}
            highlightStyle={{ fontWeight: 'normal' }}
            sanitize={latinize}
            searchWords={searchWords}
            textToHighlight={this.state.textToHighlight}
          />
        </div>
      );
    } else {
      return (<div></div>);
    }
  }

  handleFromChange(val) {
    this.setState({
      from: val,
    });
  }
  handleSizeChange(val) {
    this.setState({
      size: val,
    });
  }

  render() {
    var logsOptions = [];
    var nodesOptions = [];
    if (this.state.logSources) {
      Object(this.state.logSources).forEach(source => {
        logsOptions.push(
          {
            value: source.name,
            label: source.name
          },
        );
      });
    }

    if (this.state.networkConfig) {
      Object(this.state.networkConfig.topology.nodes).forEach(node => {
        nodesOptions.push(
          {
            value: node.name,
            label: node.name
          },
        );
      });
    }

    return (
      <div id="sysLogs">
        <table id="events">
         <tbody>
          <tr>
            <td width={330}>
              <div style={{width:300}}>
                <Dropdown
                  options={logsOptions}
                  placeholder = "Select Logs"
                  value={this.state.selectedSourceName}
                  onChange={this.selectChange}/>
              </div>
            </td>
            <td width={330}>
              <div style={{width:300}}>
                <Dropdown
                  options={nodesOptions}
                  placeholder = "Select Node"
                  value={this.state.selectedNodeName}
                  onChange={this.selectNodeChange}/>
              </div>
            </td>
            <td>
              From:
            </td>
            <td width={80}>
              <NumericInput
                className="form-control"
                style={ false }
                value={this.state.from}
                onChange={this.handleFromChange} />
            </td>
            <td>
              Size:
            </td>
            <td width={80}>
              <NumericInput
                className="form-control"
                style={ false }
                value={this.state.size}
                onChange={this.handleSizeChange} />
            </td>
            <td>
              <AsyncButton
                className="btn btn-primary"
                text='Load!'
                pendingText='Loading...'
                fulFilledText='Load!'
                fulFilledClass="btn-success"
                rejectedText='Load!'
                rejectedClass="btn-danger"
                onClick={this.loadClick}>
                {
                  ({ buttonText, isPending }) => (
                    <span>
                      { isPending && <Spinner />}
                      <span>{buttonText}</span>
                    </span>
                  )
                }
              </AsyncButton>
            </td>
          </tr>
         </tbody>
        </table>
        <div style={{marginLeft: "1em"}}>
          {this.renderLogText()}
        </div>
      </div>
    );
  }
}
