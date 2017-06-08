import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';
import Select from 'react-select';
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';


const customModalStyle = {
  content : {
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)'
  }
};

export default class ModalIgnitionState extends React.Component {
  state = {
    networkIgnitionState: null,
    linkIgnitionState: null,
    otherIgnitionState: [],
  }

  constructor(props, context) {
    super(props, context);
    this.getIgnitionState();
  }

  componentDidMount() {
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  modalClose() {
    this.props.onClose();
    clearInterval(this.timer);
  }

  statusColor(status) {
    if (status != null) {
      return (
        <span style={{color: status ? 'forestgreen' : 'firebrick'}}>
          {status ? 'Enabled' : 'Disabled'}
        </span>
      );
    } else {
      return (
        <span style={{color: 'blue'}}>Unknown</span>
      );
    }
  }

  getIgnitionState() {
    this.getRequest = new Request(
      '/controller\/getIgnitionState/' + this.props.topologyName,
      {"credentials": "same-origin"});
    fetch(this.getRequest).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          let linkIgState = null;
          let networkIgState = null;
          let otherIgState = [];
          if (json.igParams) {
            networkIgState = json.igParams.enable;
            if (json.igParams.link_auto_ignite) {
              if (networkIgState == false) {
                linkIgState = false;
              } else {
                linkIgState = true;
                Object.keys(json.igParams.link_auto_ignite).map(linkName => {
                  if (linkName == this.props.link.name) {
                    linkIgState = false;
                  } else {
                    otherIgState.push(linkName);
                  }
                });
              }
            }
          }
          this.setState({
            networkIgnitionState: networkIgState,
            linkIgnitionState: linkIgState,
            otherIgnitionState: otherIgState,
          });
        }.bind(this));
      }
    }.bind(this));
  }

  setNetworkIgnition(state) {
    let stateText = state ? "enable" : "disable";
    let promis = new Promise((resolve, reject) => {
      this.setRequest = new Request('/controller\/setNetworkIgnitionState/'+ this.props.topologyName + '/' + stateText, {"credentials": "same-origin"});
      fetch(this.setRequest).then(function(response) {
        if (response.status == 200) {
          let rspTxt = state ? 'Enabled!' : 'Disabled!'
          swal({
            title: "Network Auto Ignition " + rspTxt,
            text: "Response: "+response.statusText,
            type: "success"
          },
          function(){
            this.getIgnitionState();
            resolve();
          }.bind(this));
        } else {
          swal({
            title: "Failed!",
            text: "Setting Network Auto Ignition failed\nReason: "+response.statusText,
            type: "error"
          },
          function(){
            resolve();
          }.bind(this));
        }
      }.bind(this));
    });
  }

  setLinkIgnition(state) {
    let stateText = state ? "enable" : "disable";
    let promis = new Promise((resolve, reject) => {
      this.setRequest = new Request('/controller\/setLinkIgnitionState/'+ this.props.topologyName +'/'+ this.props.link.name +'/'+ stateText, {"credentials": "same-origin"});
      fetch(this.setRequest).then(function(response) {
        if (response.status == 200) {
          let rspTxt = state ? 'Enabled!' : 'Disabled!'
          swal({
            title: "Link Auto Ignition " + rspTxt,
            text: "Response: "+response.statusText,
            type: "success"
          },
          function(){
            this.getIgnitionState();
            resolve();
          }.bind(this));
        } else {
          swal({
            title: "Failed!",
            text: "Setting Link Auto Ignition failed\nReason: "+response.statusText,
            type: "error"
          },
          function(){
            resolve();
          }.bind(this));
        }
      }.bind(this));
    });
  }

  render() {
    let otherLinks = [];
    if (this.state.otherIgnitionState && this.state.otherIgnitionState.length) {
      this.state.otherIgnitionState.forEach(linkName => {
        otherLinks.push(<span style={{float: 'right'}}>{linkName}</span>);
        otherLinks.push(<br />);
      });
    } else {
      otherLinks = <span style={{float: 'right'}}>None</span>
    }
    return (
      <Modal
          isOpen={true}
          onRequestClose={this.modalClose.bind(this)}
          style={customModalStyle}
          contentLabel="Example Modal">
        <table>
          <tbody>
          <tr className="blank_row"/>
          <tr>
            <td width={250}>Network Auto Ignition</td>
            <td width={100}> {this.statusColor(this.state.networkIgnitionState)} </td>
            <td> <button style={{float: 'right', width:'70px'}} className='graph-button' onClick={this.setNetworkIgnition.bind(this, true)}>Enable</button></td>
            <td> <button style={{float: 'right', width:'70px'}} className='graph-button' onClick={this.setNetworkIgnition.bind(this, false)}>Disable</button></td>
          </tr>
          <tr className="blank_row"/>
          <tr>
            <td width={250}>Link Auto Ignition</td>
            <td width={100}> {this.statusColor(this.state.linkIgnitionState)} </td>
            <td> <button style={{float: 'right', width:'70px'}} className='graph-button' onClick={this.setLinkIgnition.bind(this, true)}>Enable</button></td>
            <td> <button style={{float: 'right', width:'70px'}} className='graph-button' onClick={this.setLinkIgnition.bind(this, false)}>Disable</button></td>
          </tr>
          <tr className="blank_row"/>
          <tr>
            <td width={250}>Other Links with Auto Ignition OFF</td>
            <td colSpan={3}> {otherLinks} </td>
          </tr>
          <tr className="blank_row"/>
          <tr>
            <td colSpan={4}>
              <button style={{float: 'right'}} className='graph-button' onClick={this.modalClose.bind(this)}>close</button>
            </td>
          </tr>
          </tbody>
        </table>
      </Modal>
    );
  }
}
