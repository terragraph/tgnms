import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';

import { prepareUpgrade } from '../../apiutils/upgradeAPIUtil.js';
import UpgradeNodesTable from './UpgradeNodesTable.js';

const modalStyle = {
  content : {
    width                 : 'calc(100% - 40px)',
    maxWidth              : '800px',
    display               : 'table',
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)'
  }
}

export default class ModalPrepareUpgrade extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      timeout: 180,         // timeout for the entire prepare operation
      skipFailure: true,    // skip failed nodes (will not stop operation)
      limit: 1,             // limit per batch. max batch size is infinite if this is set to 0
      imageUrl: "",         // HTTP/magnet url of the firmware image
      md5: "",              // expected md5 of the firmware image

      // HTTP
      downloadAttempts: 1,  // number of attempts for downloading the image

      // TORRENT
      downloadTimeout: 180, // timeout for torrent download
      downloadLimit: -1,    // limit for torrent download speed (-1 for unlimited)
      uploadLimit: -1,      // limit for torrent upload speed (-1 for unlimited)
      maxConnections: -1,   // max concurrent connections for torrent (-1 for unlimited)

      isHttp: true,         // internal component state to let the user specify http or torrent properties
    }
  }

  componentWillReceiveProps(nextProps) {
    // reset the selected nodes when the user opens/reopens the modal
    // this is done so our state syncs with the node table state (and we don't need to pass props to that table)
    // if (this.props.isOpen !== nextProps.isOpen) {
    //   this.setState({selectedNodes: []});
    // }
  }

  submitPrepare() {
    const requestBody = {
      nodes:        this.props.upgradeNodes,
      imageUrl:     this.state.imageUrl,
      md5:          this.state.md5,

      timeout:      this.state.timeout,
      skipFailure:  this.state.skipFailure,
      limit:        this.state.limit,

      requestId:    'NMS' + new Date().getTime(),
      isHttp:       this.state.isHttp,
      topologyName: this.props.topology.name
    };

    // populate either the downloadAttempts or the torrentParams depending on the user selected mode
    if (this.state.isHttp) {
      requestBody.downloadAttempts = this.state.downloadAttempts;
    } else {
      requestBody.torrentParams = {
        downloadTimeout:  this.state.downloadTimeout,
        downloadLimit:    this.state.downloadLimit,
        uploadLimit:      this.state.uploadLimit,
        maxConnections:   this.state.maxConnections
      }
    }

    prepareUpgrade(requestBody);
    this.props.onClose();
  }

  modalClose() {
    this.props.onClose();
  }

  onChangeDownloadMode = (e) => {
    this.setState({isHttp: e.currentTarget.value === 'http'});
  }

  render() {
    const {topology, upgradeState, isOpen} = this.props;
    /*
    Prepare modal:
      List nodes
      Timeout
      SkipFailure?
      Batch size limit
      URL of image
      MD5 of image

      // HTTP ONLY
        Number of download attempts for image

      // TORRENT ONLY
        download timeout
        download limit
        upload limit
        maxConnections
    */

    const nodesList = (
      <div className="upgrade-modal-nodes-list">
        {this.props.upgradeNodes.map((node) => <p>{node}</p>)}
      </div>
    )

    return (
      <Modal
        style={modalStyle}
        isOpen={isOpen}
        onRequestClose={this.modalClose.bind(this)}
      >
        <div className="upgrade-modal-content">
          <div className="upgrade-modal-row">
            <label>Upgrade timeout (s):</label>
            <input type="number" value={this.state.timeout}
              onChange={(event) => this.setState({'timeout': event.target.value})}
            />
          </div>

          <label>Nodes to prepare for upgrade</label>
          <div className="upgrade-modal-row">
            {nodesList}
          </div>

          <div className="upgrade-modal-row">
            <label>Skip failures?</label>
            <input type="checkbox" value={this.state.skipFailure}
              onChange={(event) => this.setState({'skipFailure': event.target.checked})}
            />
          </div>

          <div className="upgrade-modal-row">
            <label>Batch size limit:</label>
            <input type="number" value={this.state.limit}
              onChange={(event) => this.setState({'limit': event.target.value})}
            />
          </div>

          <div className="upgrade-modal-row">
            <label>Url of upgrade image:</label>
            <input type="text" value={this.state.imageUrl}
              onChange={(event) => this.setState({'imageUrl': event.target.value})}
            />
          </div>

          <div className="upgrade-modal-row">
            <label>Md5 of upgrade image:</label>
            <input type="text" value={this.state.md5}
              onChange={(event) => this.setState({'md5': event.target.value})}
            />
          </div>

          <form> <label>Specify the mode to retrieve the image:</label>
            <div className="download-type-selector">
              <input type="radio" id="http" value="http" onChange={this.onChangeDownloadMode} checked={this.state.isHttp}/>
              <label for="http" style={{marginRight: '20px'}}>Http</label>

              <input type="radio" name="torrent" value="torrent" onChange={this.onChangeDownloadMode} checked={!this.state.isHttp}/>
              <label for="torrent">Torrent</label>
            </div>
          </form>

          {this.state.isHttp &&
            <div className="upgrade-modal-row">
              <label>Download attempts for image:</label>
              <input type="number" value={this.state.downloadAttempts}
                onChange={(event) => this.setState({'downloadAttempts': event.target.value})}
              />
            </div>
          }

          {!this.state.isHttp &&
            <div>
              <div className="upgrade-modal-row">
                <label>Download timeout (torrent):</label>
                <input type="number" value={this.state.downloadTimeout}
                  onChange={(event) => this.setState({'downloadTimeout': event.target.value})}
                />
              </div>

              <div className="upgrade-modal-row">
                <label>Max download speed (-1 for unlimited):</label>
                <input type="number" value={this.state.downloadLimit}
                  onChange={(event) => this.setState({'downloadLimit': event.target.value})}
                />
              </div>

              <div className="upgrade-modal-row">
                <label>Max upload speed (-1 for unlimited):</label>
                <input type="number" value={this.state.uploadLimit}
                  onChange={(event) => this.setState({'uploadLimit': event.target.value})}
                />
              </div>

              <div className="upgrade-modal-row">
                <label>Max peer connections (-1 for unlimited):</label>
                <input type="number" value={this.state.maxConnections}
                  onChange={(event) => this.setState({'maxConnections': event.target.value})}
                />
              </div>
            </div>
          }

        </div>
        <div className="upgrade-modal-footer">
          <button className='upgrade-modal-btn' onClick={this.modalClose.bind(this)}>Close</button>
          <button className='upgrade-modal-btn' onClick={this.submitPrepare.bind(this)} style={{'backgroundColor': '#8b9dc3'}}>Submit</button>
        </div>
      </Modal>
    );
  }
}

ModalPrepareUpgrade.propTypes = {
  upgradeNodes: React.PropTypes.array.isRequired,
  isOpen: React.PropTypes.bool.isRequired,
  onClose: React.PropTypes.func.isRequired,
  topology: React.PropTypes.object.isRequred,
}
