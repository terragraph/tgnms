import React from 'react';
// leaflet maps
import { render } from 'react-dom';
// dispatcher
import { Actions } from './NetworkConstants.js';
import AsyncButton from 'react-async-button';
import DatePicker from 'react-datepicker';
import Dispatcher from './NetworkDispatcher.js';
import moment from 'moment';
import NetworkStore from './NetworkStore.js';
import NumericInput from 'react-numeric-input';
import Select from 'react-select';

require('react-datepicker/dist/react-datepicker.css');

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
    offset: 0,
    size: 2000,
    logText: "",
    startDate: moment(),
  }

  constructor(props) {
    super(props);
    this.selectChange = this.selectChange.bind(this);
    this.selectNodeChange = this.selectNodeChange.bind(this);
    this.getConfigs = this.getConfigs.bind(this);
    this.loadClick = this.loadClick.bind(this);
    this.handleSizeChange = this.handleSizeChange.bind(this);
    this.handleOffsetChange = this.handleOffsetChange.bind(this);
    this.handleDateChange = this.handleDateChange.bind(this);

    this.getConfigs();
  }

  componentWillMount() {
    // register once we're visible
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
  }

  componentWillUnmount() {
    // un-register if we're no longer visible
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {

    switch (payload.actionType) {
      // TODO - compare props to reset
      case Actions.TOPOLOGY_SELECTED:
        this.setState({
          selectedNodeName: null,
        });
        break;
    }
  }

  getConfigs() {
    let getLogSources = new Request('/getSystemLogsSources/', {"credentials": "same-origin"});
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
        let exec = new Request('/getSystemLogs/'+ this.state.selectedSourceName+'/'+this.state.offset+'/'+this.state.size+'/'+this.state.selectedNodeMac+'/'+this.state.startDate.format('MM-DD-YYYY'), {"credentials": "same-origin"});
        fetch(exec).then(function(response) {
          if (response.status == 200) {
            response.json().then(function(json) {
              var text = ""
              json.forEach(line => {
                text += line + "\n";
              });
              this.setState({
                logText: text,
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
        });
        return;
      }
    });
  }

  selectNodeChange(val) {
    Object(this.props.networkConfig.topology.nodes).forEach(node => {
      if (node.name == val.value) {
        this.setState({
          selectedNodeMac: node.mac_addr,
          selectedNodeName: val.label,
        });
        return;
      }
    });
  }

  handleOffsetChange(val) {
    this.setState({
      offset: val,
    });
  }
  handleSizeChange(val) {
    this.setState({
      size: val,
    });
  }

  handleDateChange(date) {
    this.setState({
      startDate: date,
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

    if (this.props.networkConfig) {
      Object(this.props.networkConfig.topology.nodes).forEach(node => {
        nodesOptions.push(
          {
            value: node.name,
            label: node.name
          },
        );
      });
    }

    return (
      <div style={{width:'100%', height:'100%', position: "fixed !important"}}>
        <table style={{borderCollapse: "separate", borderSpacing: "15px 5px"}}>
         <tbody>
          <tr>
            <td width={250}>
              <div style={{width:250}}>
                <Select
                  name="Select Logs"
                  value={this.state.selectedSourceName}
                  options={logsOptions}
                  onChange={this.selectChange}
                  clearable={false}/>
              </div>
            </td>
            <td width={250}>
              <div style={{width:250}}>
                <Select
                  options={nodesOptions}
                  name = "Select Node"
                  value={this.state.selectedNodeName}
                  onChange={this.selectNodeChange}
                  clearable={false}/>
              </div>
            </td>
            <td>
              Date:
            </td>
            <td>
              <DatePicker
              selected={this.state.startDate}
              onChange={this.handleDateChange} />
            </td>
            <td>
              Lines:
            </td>
            <td width={80}>
              <NumericInput
                className="form-control"
                style={ false }
                value={this.state.size}
                onChange={this.handleSizeChange} />
            </td>
            <td>
              Offset from End:
            </td>
            <td width={80}>
              <NumericInput
                className="form-control"
                style={ false }
                value={this.state.offset}
                onChange={this.handleOffsetChange} />
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
        <div style={{marginLeft: "1em", marginRight: "1em", paddingBottom: "90px", height:'100%'}}>
          <textarea style={{width: '100%', height:'100%', resize:'none'}} readOnly value={this.state.logText} />
        </div>
      </div>
    );
  }
}
SystemLogs.propTypes = {
  networkConfig: React.PropTypes.object.isRequired,
};
