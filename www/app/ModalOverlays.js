import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';
import {SiteOverlayKeys, linkOverlayKeys} from './NetworkConstants.js';


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

export default class ModalOverlays extends React.Component {
  state = {
    selectedSiteOverlay: 'Health',
    selectedLinkOverlay: 'Health',
  }

  componentDidMount() {
    if (this.props.selectedSiteOverlay && this.props.selectedLinkOverlay)
    this.setState({
      selectedSiteOverlay: this.props.selectedSiteOverlay,
      selectedLinkOverlay: this.props.selectedLinkOverlay,
    });
  }

  overlaysModalClose() {
    this.props.onClose(this.state.selectedSiteOverlay, this.state.selectedLinkOverlay);
  }

  render() {
    let siteOverlayKeyRows = [];
    let siteOverlaySource = SiteOverlayKeys[this.state.selectedSiteOverlay];
    Object.keys(siteOverlaySource).map(siteState => {
      siteOverlayKeyRows.push(
      <tr key={siteState}>
        <td></td>
        <td>
          <font color={siteOverlaySource[siteState].color}> {siteState} </font>
        </td>
      </tr>);
    });
    let linkOverlayKeyRows = [];
    let linkOverlaySource = linkOverlayKeys[this.state.selectedLinkOverlay];
    Object.keys(linkOverlaySource).map(linkState => {
      linkOverlayKeyRows.push(
      <tr key={linkState}>
        <td></td>
        <td>
          <font color={linkOverlaySource[linkState].color}> {linkState} </font>
        </td>
      </tr>);
    });

    return (
      <Modal
          isOpen={this.props.isOpen}
          onRequestClose={this.overlaysModalClose.bind(this)}
          style={customModalStyle}
          contentLabel="Example Modal">
        <table>
          <tbody>
          <tr>
            <td width={100}>Site Overlay</td>
            <td width={100}>
              <div style={{width:100}}>
                <select
                  style={{width:100}}
                  value={this.state.selectedSiteOverlay}
                  onChange={ (ev) => { this.setState({ selectedSiteOverlay: ev.currentTarget.value }); } }
                >
                  {Object.keys(SiteOverlayKeys).map(overlay => (<option key={ overlay } value={ overlay }>{ overlay }</option>)) }
                </select>
              </div>
            </td>
          </tr>
          {siteOverlayKeyRows}
          <tr className="blank_row">
          </tr>
          <tr>
            <td width={100}>Link Overlay</td>
            <td width={100}>
              <div style={{width:100}}>
                <select
                  style={{width:100}}
                  value={this.state.selectedLinkOverlay}
                  onChange={ (ev) => { this.setState({ selectedLinkOverlay: ev.currentTarget.value }); } }
                >
                  {Object.keys(linkOverlayKeys).map(overlay => (<option key={ overlay } value={ overlay }>{ overlay }</option>)) }
                </select>
              </div>
            </td>
          </tr>
          {linkOverlayKeyRows}
          </tbody>
        </table>
        <button style={{float: 'right'}} className='graph-button' onClick={this.overlaysModalClose.bind(this)}>close</button>
      </Modal>
    );
  }
}
