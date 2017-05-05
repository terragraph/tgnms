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

const linkTypesVector = [
  { value: 'WIRELESS', label: 'WIRELESS' },
  { value: 'ETHERNET', label: 'ETHERNET' }
];

export default class ModalLinkAdd extends React.Component {
  state = {
    linkNode1: null,
    linkNode2: null,
    linkType: null,
  }

  componentDidMount() {
  }

  modalClose() {
    this.props.onClose();
  }

  addLink() {
    let nodeA = '';
    let nodeZ = '';
    if (this.state.linkNode1 && this.state.linkNode2 && this.state.linkType) {
      if (this.state.linkNode1 < this.state.linkNode2) {
          nodeA = this.state.linkNode1;
          nodeZ = this.state.linkNode2;
      } else {
        nodeA = this.state.linkNode2;
        nodeZ = this.state.linkNode1;
      }
    } else {
      alert('Some Params are missing');
      return;
    }

    let linkName = 'link-' + nodeA + '-' + nodeZ;
    swal({
      title: "Are you sure?",
      text: "You are adding a link to this topology!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, add it!",
      closeOnConfirm: false
    },
    function(){
      let promis = new Promise((resolve, reject) => {
        let exec = new Request('/controller\/addLink/'+ this.props.topology.name +'/'+ linkName +'/'+ nodeA +'/'+ nodeZ +'/'+this.state.linkType, {"credentials": "same-origin"});
        fetch(exec).then(function(response) {
          if (response.status == 200) {
            swal({
              title: "Link Added!",
              text: "Response: "+response.statusText,
              type: "success"
            },
            function(){
              resolve();
            }.bind(this));
          } else {
            swal({
              title: "Failed!",
              text: "Adding a link failed\nReason: "+response.statusText,
              type: "error"
            },
            function(){
              resolve();
            }.bind(this));
          }
        }.bind(this));
      });
    }.bind(this));
  }

  render() {
    var nodesVector = [];

    if (this.props.topology.nodes) {
      Object(this.props.topology.nodes).forEach(node => {
        nodesVector.push(
          {
            value: node.name,
            label: node.name
          },
        );
      });
    }

    return (
      <Modal
          isOpen={this.props.isOpen}
          onRequestClose={this.modalClose.bind(this)}
          style={customModalStyle}
          contentLabel="Example Modal">
        <table>
          <tbody>
          <tr className="blank_row"/>
          <tr>
            <td width={100}>Node 1</td>
            <td>
              <Select
                options={nodesVector}
                name = "Select Node"
                value={this.state.linkNode1}
                onChange={(val) => this.setState({linkNode1: val.value})}
                clearable={false}/>
            </td>
          </tr>
          <tr className="blank_row"/>
          <tr>
            <td width={100}>Node 2</td>
            <td>
              <Select
                options={nodesVector}
                name = "Select Node"
                value={this.state.linkNode2}
                onChange={(val) => this.setState({linkNode2: val.value})}
                clearable={false}/>
            </td>
          </tr>
          <tr className="blank_row"/>
          <tr>
            <td width={100}>Type</td>
            <td>
              <Select
                options={linkTypesVector}
                name = "Select Type"
                value={this.state.linkType}
                onChange={(val) => this.setState({linkType: val.value})}
                clearable={false}/>
            </td>
          </tr>
          <tr className="blank_row"/>
          <tr>
            <td width={100}>Link Name</td>
            <td>
              {this.state.linkNode1 < this.state.linkNode2 ?
                'link-' + this.state.linkNode1+'-'+this.state.linkNode2 :
                'link-' + this.state.linkNode2+'-'+this.state.linkNode1}
            </td>
          </tr>
          <tr className="blank_row"/>
          <tr>
            <td width={100}/>
            <td>
              <button style={{float: 'right'}} className='graph-button' onClick={this.modalClose.bind(this)}>close</button>
              <button style={{float: 'right'}} className='graph-button' onClick={this.addLink.bind(this)}>Add Link</button>
            </td>
          </tr>
          </tbody>
        </table>
      </Modal>
    );
  }
}
