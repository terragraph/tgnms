/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import axios from 'axios';
import Modal from 'react-modal';
import React from 'react';
import swal from 'sweetalert';

const customModalStyle = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
};

export default class ModalIgnitionState extends React.Component {
  state = {
    networkIgnitionState: null,
    linkIgnitionState: null,
    otherIgnitionState: [],
  };

  constructor(props, context) {
    super(props, context);
    this.getIgnitionState();
  }

  componentDidMount() {}

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
      return <span style={{color: 'blue'}}>Unknown</span>;
    }
  }

  getIgnitionState() {
    axios
      .get('/controller/getIgnitionState/' + this.props.topologyName)
      .then(response => {
        const json = response.data;
        let linkIgState = null;
        let networkIgState = null;
        const otherIgState = [];
        if (json.igParams) {
          networkIgState = json.igParams.enable;
          if (json.igParams.linkAutoIgnite) {
            // explicitly check because coercing a null into a boolean will return a false
            if (networkIgState === false) {
              linkIgState = false;
            } else {
              linkIgState = true;
              Object.keys(json.igParams.linkAutoIgnite).map(linkName => {
                if (linkName === this.props.link.name) {
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
      });
  }

  setNetworkIgnition(state) {
    const stateText = state ? 'enable' : 'disable';
    const url =
      '/controller/setNetworkIgnitionState/' +
      this.props.topologyName +
      '/' +
      stateText;

    axios
      .get(url)
      .then(response =>
        swal(
          {
            title:
              'Network Auto Ignition ' + (state ? 'Enabled!' : 'Disabled!'),
            text: 'Response: ' + response.statusText,
            type: 'success',
          },
          () => this.getIgnitionState(),
        ),
      )
      .catch(error =>
        swal({
          title: 'Failed!',
          text:
            'Setting Network Auto Ignition failed\nReason: ' +
            error.response.statusText,
          type: 'error',
        }),
      );
  }

  setLinkIgnition(state) {
    const stateText = state ? 'enable' : 'disable';
    const url =
      '/controller/setLinkIgnitionState/' +
      this.props.topologyName +
      '/' +
      this.props.link.name +
      '/' +
      stateText;
    axios
      .get(url)
      .then(response =>
        swal(
          {
            title: 'Link Auto Ignition ' + (state ? 'Enabled!' : 'Disabled!'),
            text: 'Response: ' + response.statusText,
            type: 'success',
          },
          () => this.getIgnitionState(),
        ),
      )
      .catch(error =>
        swal({
          title: 'Failed!',
          text:
            'Setting Link Auto Ignition failed\nReason: ' +
            error.response.statusText,
          type: 'error',
        }),
      );
  }

  render() {
    let otherLinks = [];
    if (this.state.otherIgnitionState && this.state.otherIgnitionState.length) {
      this.state.otherIgnitionState.forEach(linkName => {
        otherLinks.push(<span style={{float: 'right'}}>{linkName}</span>);
        otherLinks.push(<br />);
      });
    } else {
      otherLinks = <span style={{float: 'right'}}>None</span>;
    }
    return (
      <Modal
        isOpen={true}
        onRequestClose={this.modalClose.bind(this)}
        style={customModalStyle}
        contentLabel="Example Modal">
        <table>
          <tbody>
            <tr className="blank_row" />
            <tr>
              <td width={250}>Network Auto Ignition</td>
              <td width={100}>
                {' '}
                {this.statusColor(this.state.networkIgnitionState)}{' '}
              </td>
              <td>
                {' '}
                <button
                  style={{float: 'right', width: '70px'}}
                  className="graph-button"
                  onClick={this.setNetworkIgnition.bind(this, true)}>
                  Enable
                </button>
              </td>
              <td>
                {' '}
                <button
                  style={{float: 'right', width: '70px'}}
                  className="graph-button"
                  onClick={this.setNetworkIgnition.bind(this, false)}>
                  Disable
                </button>
              </td>
            </tr>
            <tr className="blank_row" />
            <tr>
              <td width={250}>Link Auto Ignition</td>
              <td width={100}>
                {' '}
                {this.statusColor(this.state.linkIgnitionState)}{' '}
              </td>
              <td>
                {' '}
                <button
                  style={{float: 'right', width: '70px'}}
                  className="graph-button"
                  onClick={this.setLinkIgnition.bind(this, true)}>
                  Enable
                </button>
              </td>
              <td>
                {' '}
                <button
                  style={{float: 'right', width: '70px'}}
                  className="graph-button"
                  onClick={this.setLinkIgnition.bind(this, false)}>
                  Disable
                </button>
              </td>
            </tr>
            <tr className="blank_row" />
            <tr>
              <td width={250}>Other Links with Auto Ignition OFF</td>
              <td colSpan={3}> {otherLinks} </td>
            </tr>
            <tr className="blank_row" />
            <tr>
              <td colSpan={4}>
                <button
                  style={{float: 'right'}}
                  className="graph-button"
                  onClick={this.modalClose.bind(this)}>
                  close
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </Modal>
    );
  }
}
