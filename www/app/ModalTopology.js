import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';
import ModalLinkAdd from './ModalLinkAdd.js';
import ModalNodeAdd from './ModalNodeAdd.js';
import ModalCSVUpload from './ModalCSVUpload.js';
import { Actions } from './constants/NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
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

export default class ModalTopology extends React.Component {
  state = {
    addNodeModalOpen: false,
    addLinkModalOpen: false,
    uploadCSVModelOpen: false,
  };

  componentDidMount() {
  }

  modalClose() {
    this.props.onClose();
  }

  onAddSite() {
    Dispatcher.dispatch({
      actionType: Actions.PLANNED_SITE_CREAT,
      siteName: "planned_site",
    });
    swal({
      title: "Planned Site Added",
      text: "Drag the planned site on the map to desired location. Then, you can commit it from the details menu",
      type: "info",
      closeOnConfirm: true,
    },
    function(){
      this.props.onClose();
    }.bind(this));
  }
  
  render() {
    let hideParentModal = false;
    let visibleModal = {};
    if (this.state.addLinkModalOpen) {
      visibleModal =
        <ModalLinkAdd
        isOpen= {this.props.isOpen}
        onClose= {() => this.setState({addLinkModalOpen: false})}
        topology= {this.props.topology}/>;
    } else if (this.state.addNodeModalOpen) {
      visibleModal =
        <ModalNodeAdd
        isOpen= {this.props.isOpen}
        onClose= {() => this.setState({addNodeModalOpen: false})}
        topology= {this.props.topology}/>;
    } else if (this.state.addSiteModalOpen) {
      visibleModal =
        <ModalSiteAdd
          isOpen={this.props.isOpen}
          onClose={() => this.setState({addSiteModalOpen: false})}
          topology={this.props.topology}/>;
    } else if (this.state.uploadCSVModelOpen) {
      visibleModal =
        <ModalCSVUpload
          isOpen={this.props.isOpen}
          onClose={() => this.setState({uploadCSVModelOpen: false})}
          topology={this.props.topology}/>;
    } else {
      visibleModal =
        <Modal
            isOpen={this.props.isOpen}
            onRequestClose={this.modalClose.bind(this)}
            style={customModalStyle}
            contentLabel="Example Modal">
          <table>
            <tbody>
            <tr>
              <td width={100}>Sites</td>
              <td width={100}>
                <button style={{float: 'right'}} className='graph-button'
                  onClick={this.onAddSite.bind(this)}>Add Planned</button>
              </td>
              <td width={100}>
                <button style={{float: 'right'}} className='graph-button'
                  onClick={() => swal("Select a Site on the map and delete it from the details menu!")}>Remove</button>
              </td>
            </tr>
            <tr className="blank_row"/>
            <tr>
              <td width={100}>Nodes</td>
              <td width={100}>
                <button style={{float: 'right'}} className='graph-button' onClick={() => this.setState({addNodeModalOpen: true})}>Add</button>
              </td>
              <td width={100}>
                <button style={{float: 'right'}} className='graph-button'
                  onClick={() => swal("Select a Node on the map and delete it from the details menu!")}>Remove</button>
              </td>
            </tr>
            <tr className="blank_row"/>
            <tr>
              <td width={100}>Links</td>
              <td width={100}>
                <button style={{float: 'right'}} className='graph-button' onClick={() => this.setState({addLinkModalOpen: true})}>Add</button>
              </td>
              <td width={100}>
                <button style={{float: 'right'}} className='graph-button'
                  onClick={() => swal("Select a Link on the map and delete it from the details menu!")}>Remove</button>
              </td>
            </tr>
            <tr className="blank_row"/>
            <tr>
              <td width={100}>CSV</td>
              <td width={100}/>
              <td width={100}>
                {/*<input type="file" style={{float: 'right'}} className='graph-button'>Upload</input>*/}
                <button style={{float: 'right'}} className='graph-button' onClick={() => this.setState({uploadCSVModelOpen: true})}>Upload</button>
              </td>
            </tr>
            <tr className="blank_row"/>
            <tr>
              <td width={100}/>
              <td width={100}/>
              <td width={100}>
                <button style={{float: 'right'}} className='graph-button' onClick={this.modalClose.bind(this)}>close</button>
              </td>
            </tr>
            </tbody>
          </table>
        </Modal>;
    }

    return (visibleModal);
  }
}
