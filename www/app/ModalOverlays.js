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

  modalClose() {
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
    if (linkOverlaySource.values) {
      for (var i = 0; i < linkOverlaySource.values.length; ++i) {
        linkOverlayKeyRows.push(
          <tr key={linkOverlaySource.values[i]}>
            <td></td>
            <td>
              <font style={{color:linkOverlaySource.colors[i]}}> less than {linkOverlaySource.values[i]} </font>
            </td>
          </tr>);
      };
      linkOverlayKeyRows.push(
        <tr key='last'>
          <td></td>
          <td>
            <font style={{color:linkOverlaySource.colors[linkOverlaySource.colors.length-1]}}> more than {linkOverlaySource.values[linkOverlaySource.values.length-1]} </font>
          </td>
        </tr>);
    }

    return (
      <Modal
          isOpen={this.props.isOpen}
          onRequestClose={this.modalClose.bind(this)}
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
          <tr className="blank_row">
          </tr>
          <tr>
            <td colSpan={2}>
              <button style={{float: 'left'}} className='graph-button' onClick={this.modalClose.bind(this)}>close</button>
            </td>
          </tr>
          </tbody>
        </table>
      </Modal>
    );
  }
}
