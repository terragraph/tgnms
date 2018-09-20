/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * Display docker images from a single host.
 */
'use strict';

import {CustomTableCell, styles} from './MaterialExpansionPanelStyles.js';
import {deleteImageById, getImageJson} from '../../apiutils/DockerUtils.js';
import axios from 'axios';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';
import swal from 'sweetalert';

import AddIcon from '@material-ui/icons/Add';
import Button from '@material-ui/core/Button';
import DeleteIcon from '@material-ui/icons/Delete';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import LinearProgress from '@material-ui/core/LinearProgress';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';

class DockerImages extends React.Component {
  _fileUploadInput = null;
  _intervalId = null;
  static propTypes = {
    instanceId: PropTypes.number.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      fileIsUploading: false,
      fileUploadProgress: 0,
      imageList: [],
      isExpanded: false,
      selectedFile: null,
    };
  }
  async uploadImage(dockerImage) {
    if (!dockerImage) {
      return;
    }
    this.setState({fileIsUploading: true, fileUploadProgress: 0});

    const data = new FormData();
    data.append('binary', dockerImage);

    const config = {
      onUploadProgress: (progressEvent: any) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        // TODO - show upload progress
        // console.log('upload progress', percentCompleted);
        this.setState({
          fileIsUploading: (percentCompleted !== 100),
          fileUploadProgress: percentCompleted,
        });
        // reset file list
        if (percentCompleted === 100) {
          this._fileUploadInput.value = '';
        }
      },
    };

    try {
      // Upload binary to server, then send apiservice the url of the image
      const url = `/docker/${this.props.instanceId}/images/upload`;
      axios.post(url, data, config
        ).then(resp => {
          this.setState({
            fileIsUploading: false,
            fileUploadProgress: 0,
          });
        }).catch(err => {
          this.setState({
            fileIsUploading: false,
            fileUploadProgress: 0,
          });
        });
    } catch (ex) { }
  }

  componentDidMount() {
    this.loadImageList();
    this._intervalId = setInterval(this.loadImageList.bind(this),
                                   window.CONFIG.refresh_interval);
  }

  componentWillUnmount() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
    }
  }

  deleteImage(id) {
    deleteImageById(this.props.instanceId, id).then(imageList => {
      // refresh image list
      this.loadImageList();
      swal('Deleted docker image',
           `Image '${id}' deleted!`,
           'ok');
    }).catch(err => {
      swal('Unable to delete image',
           `Docker message: ${err.response.data.message}`,
           'error');
    });
  }

  loadImageList() {
    if (this.props.instanceId === 0) {
      return;
    }
    getImageJson(this.props.instanceId).then(imageList =>
      this.setState({imageList, isExpanded: true}),
    );
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.instanceId !== this.props.instanceId) {
      this.loadImageList();
    }
  }

  formatSizeMb(bytes) {
    return Math.round((bytes / 1024 / 1024) * 100) / 100 + ' MB';
  }

  onSubmitFile = () => {
    // use state to ensure instantaneous update
    this.setState(
      {
        selectedFile: this._fileUploadInput.files[0],
      },
      this.onUploadFile,
    );
  }

  onUploadFile = () => {
    this.uploadImage(
      this.state.selectedFile,
    ).then();
  }

  render() {
    const {classes} = this.props;
    const {imageList, isExpanded} = this.state;
    return (
      <ExpansionPanel
        expanded={isExpanded}
        onChange={(evt, expanded) => this.setState({isExpanded: expanded})}>
        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
          <Typography className={classes.heading}>Images</Typography>
        </ExpansionPanelSummary>
        {imageList.length && (
          <ExpansionPanelDetails>
            <Table className={classes.table}>
              <TableHead className={classes.head}>
                <TableRow>
                  <CustomTableCell>Id</CustomTableCell>
                  <CustomTableCell>Tag(s)</CustomTableCell>
                  <CustomTableCell>Created</CustomTableCell>
                  <CustomTableCell>Size</CustomTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {imageList.map(row => {
                  return (
                    <TableRow className={classes.row} key={row.Id}>
                      <CustomTableCell component="th" scope="row">
                        {row.Id}
                      </CustomTableCell>
                      <CustomTableCell>
                        {row.RepoTags &&
                          row.RepoTags.map(tag => tag).join(', ')}
                      </CustomTableCell>
                      <CustomTableCell>
                        {row.Created && moment(row.Created * 1000).fromNow()}
                      </CustomTableCell>
                      <CustomTableCell numeric>
                        {row.Size && this.formatSizeMb(row.Size)}
                      </CustomTableCell>
                      <CustomTableCell>
                        <Button
                          variant="fab"
                          color="primary"
                          aria-label="Add"
                          onClick={evt => {
                            this.deleteImage(row.Id);
                          }}
                          className={classes.button}>
                          <DeleteIcon />
                        </Button>
                      </CustomTableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ExpansionPanelDetails>
        )}
        <Button
          variant="fab"
          color="primary"
          aria-label="Add"
          disabled={this.state.fileIsUploading}
          onClick={evt => {
            if (this._fileUploadInput.files.length === 0) {
              this._fileUploadInput.click();
            }
          }}
          className={classes.button}>
          <AddIcon />
        </Button>
        <input
          accept="tar.gz"
          onChange={this.onSubmitFile.bind(this)}
          ref={input => (this._fileUploadInput = input)}
          type="file"
          style={{display: 'none'}}
        />
        {this.state.fileIsUploading && <LinearProgress
            style={{width: '100%'}}
            variant="determinate"
            value={this.state.fileUploadProgress} />}
      </ExpansionPanel>
    );
  }
}
export default withStyles(styles, {withTheme: true})(DockerImages);
