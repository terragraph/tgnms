/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import AddIcon from '@material-ui/icons/Add';
import Button from '@material-ui/core/Button';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import LinearProgress from '@material-ui/core/LinearProgress';
import LinkIcon from '@material-ui/icons/Link';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MaterialModal from '../../components/common/MaterialModal';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import ModalImageList from './ModalImageList';
import React from 'react';
import RefreshIcon from '@material-ui/icons/Refresh';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import axios from 'axios';
import classNames from 'classnames';
import copy from 'copy-to-clipboard';
import swal from 'sweetalert2';
import {
  REVERT_UPGRADE_IMAGE_STATUS,
  SOFTWARE_PORTAL_SUITE,
  UPGRADE_IMAGE_REFRESH_INTERVAL,
  UploadStatus,
} from '../../constants/UpgradeConstants';
import {
  apiServiceRequest,
  apiServiceRequestWithConfirmation,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil';
import {
  fetchSoftwarePortalImages,
  fetchUpgradeImages,
} from '../../helpers/UpgradeHelpers';
import {isFeatureEnabled} from '../../constants/FeatureFlags';

import {withStyles} from '@material-ui/core/styles';

import type {UpgradeImageType} from '../../../shared/types/Controller';

export type SoftwareImageType = UpgradeImageType & {
  versionNumber?: string,
  sha1?: string,
};

const styles = theme => ({
  dialogTitle: {
    padding: `${theme.spacing()}px ${theme.spacing(2)}px 0`,
  },
  avatar: {
    fontSize: '1rem',
    padding: 2,
    backgroundColor: theme.palette.primary.light,
  },
  button: {
    margin: theme.spacing(),
  },
  centerText: {
    textAlign: 'center',
  },
  deleteIcon: {
    color: '#c0392a',
  },
  fileInput: {
    display: 'none',
  },
  leftIcon: {
    marginRight: theme.spacing(),
  },
  rightIcon: {
    float: 'right',
  },
  softwareImageHeader: {
    paddingTop: '12px',
  },
});

type Props = {|
  classes: {[key: string]: string},
  networkName: string,
|};

type State = {|
  isOpen: boolean,
  menuAnchorEl: ?HTMLAnchorElement,
  menuImage: ?SoftwareImageType,
  upgradeImages: Array<SoftwareImageType>,
  softwarePortalImages: Array<SoftwareImageType>,
  uploadProgress: number,
  uploadStatus: string,
|};

class ModalUpgradeImages extends React.Component<Props, State> {
  _intervalID: IntervalID = setInterval(
    this.handleFetchImages,
    UPGRADE_IMAGE_REFRESH_INTERVAL,
  );

  state = {
    isOpen: false,
    menuAnchorEl: null,
    menuImage: null,

    // upgrade images properties
    upgradeImages: [],
    softwarePortalImages: [],
    uploadProgress: 0,
    uploadStatus: UploadStatus.NONE,
  };

  componentDidMount = () => {
    this.handleFetchImages();
  };

  componentWillUnmount = () => {
    clearInterval(this._intervalID);
  };

  shouldComponentUpdate = (_prevProps, prevState) => {
    const {isOpen} = this.state;

    // Don't re-render the component if the upgradeImages list is updated while
    // the modal is closed
    return isOpen || prevState.isOpen != isOpen;
  };

  handleFetchImages = () => {
    fetchUpgradeImages(this.props.networkName, images =>
      this.setState({upgradeImages: images}),
    );
    if (isFeatureEnabled('SOFTWARE_PORTAL_ENABLED')) {
      fetchSoftwarePortalImages({suite: SOFTWARE_PORTAL_SUITE}, images => {
        this.setState({softwarePortalImages: images});
      });
    }
  };

  handleUploadImage = async event => {
    const upgradeImage = event.target.files[0];

    if (!upgradeImage) {
      return;
    }

    const data = new FormData();
    data.append('binary', upgradeImage);

    const config = {
      onUploadProgress: progressEvent => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        this.setState({
          uploadStatus: UploadStatus.UPLOADING,
          uploadProgress: percentCompleted,
        });
      },
    };

    try {
      // Upload the image to the server and send the image url to the apiservice
      const url = '/controller/uploadUpgradeBinary';
      const uploadResponse = await axios.post(url, data, config);

      this.setState({uploadStatus: UploadStatus.SUCCESS});
      await apiServiceRequest(
        this.props.networkName,
        'addUpgradeImage',
        uploadResponse.data,
      );
    } catch (error) {
      const errorText = getErrorTextFromE2EAck(error);
      swal({
        type: 'error',
        title: 'Upload Image Failed',
        text: `Your upgrade command failed with the following message:\n\n${errorText}.`,
      });
      this.setState({uploadStatus: UploadStatus.FAILURE});
    } finally {
      // Revert upload status to none after brief delay
      setTimeout(() => {
        this.setState({uploadStatus: UploadStatus.NONE});
      }, REVERT_UPGRADE_IMAGE_STATUS);

      this.handleFetchImages();
    }
  };

  handleDeleteImage() {
    // Delete the selected image
    const {networkName} = this.props;
    const {menuImage} = this.state;
    const data = {name: menuImage?.name};

    apiServiceRequestWithConfirmation(networkName, 'delUpgradeImage', data, {
      desc: `The following image will be deleted from the server:
        <p><em>${menuImage?.name || ''}</em></p>`,
      descType: 'html',
      getSuccessStr: _msg => 'The image was deleted.',
      successType: 'text',
      onSuccess: () => this.handleFetchImages(),
    });
  }

  handleOpen = () => {
    // Open the modal
    this.setState({isOpen: true});
  };

  handleClose = () => {
    // Close the modal
    this.setState({isOpen: false});
  };

  handleCopyMagnetURI() {
    // Copy the magnet URI for the selected image
    copy(this.state.menuImage?.magnetUri);
  }

  handleMenuClose() {
    // Close the actions menu
    this.setState({menuAnchorEl: null, menuImage: null});
  }

  handleAnchorClick = (
    menuAnchorEl: HTMLAnchorElement,
    menuImage: SoftwareImageType,
  ) => {
    this.setState({
      menuAnchorEl,
      menuImage,
    });
  };

  renderUploadProgressBar = () => {
    const {classes} = this.props;
    const {uploadProgress, uploadStatus} = this.state;

    switch (uploadStatus) {
      case UploadStatus.UPLOADING:
        return (
          <>
            <div>Uploading {uploadProgress}%</div>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </>
        );
      case UploadStatus.SUCCESS:
        return <div>Upload Succeeded</div>;
      case UploadStatus.FAILURE:
        return <div>Upload Failed</div>;
      case UploadStatus.NONE:
      default:
        return (
          <>
            <Button
              className={classes.button}
              component="label"
              variant="outlined"
              size="small">
              <AddIcon className={classes.leftIcon} />
              <Typography variant="subtitle1">Upload Binary</Typography>
              <input
                className={classes.fileInput}
                accept=".bin"
                onChange={this.handleUploadImage}
                type="file"
              />
            </Button>
            <Tooltip title="Refresh List" placement="top">
              <IconButton
                className={classNames(classes.rightIcon, classes.button)}
                onClick={this.handleFetchImages}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </>
        );
    }
  };

  render() {
    const {classes} = this.props;
    const {
      menuAnchorEl,
      isOpen,
      upgradeImages,
      softwarePortalImages,
    } = this.state;

    return (
      <div>
        <Button
          className={classes.button}
          onClick={this.handleOpen}
          variant="outlined">
          Manage Upgrade Images
        </Button>
        <MaterialModal
          classes={{dialogTitle: classes.dialogTitle}}
          open={isOpen}
          onClose={this.handleClose}
          modalTitle={this.renderUploadProgressBar()}
          modalContent={
            upgradeImages.length === 0 ? (
              <Typography className={classes.centerText} variant="subtitle1">
                Click on the "Upload Binary" button to get started!
              </Typography>
            ) : (
              <>
                <Typography variant="subtitle1">Uploaded Images</Typography>
                <ModalImageList
                  upgradeImages={upgradeImages}
                  checksumType="MD5"
                  onClick={this.handleAnchorClick}
                />
                {isFeatureEnabled('SOFTWARE_PORTAL_ENABLED') ? (
                  <>
                    <Divider />
                    <Typography
                      className={classes.softwareImageHeader}
                      variant="subtitle1">
                      Software Portal Images
                    </Typography>
                    <ModalImageList
                      upgradeImages={softwarePortalImages}
                      checksumType="SHA1"
                      onClick={this.handleAnchorClick}
                    />
                  </>
                ) : null}

                <Menu
                  anchorEl={menuAnchorEl}
                  open={Boolean(menuAnchorEl)}
                  onClose={() => this.handleMenuClose()}>
                  <MenuItem
                    onClick={() => {
                      this.handleCopyMagnetURI();
                      this.handleMenuClose();
                    }}>
                    <ListItemIcon>
                      <LinkIcon />
                    </ListItemIcon>
                    <ListItemText inset primary="Copy Magnet URI" />
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      this.handleDeleteImage();
                      this.handleMenuClose();
                    }}>
                    <ListItemIcon>
                      <DeleteForeverIcon className={classes.deleteIcon} />
                    </ListItemIcon>
                    <ListItemText inset primary="Delete Image" />
                  </MenuItem>
                </Menu>
              </>
            )
          }
          modalActions={
            <Button
              className={classes.button}
              onClick={this.handleClose}
              variant="outlined">
              Close
            </Button>
          }
        />
      </div>
    );
  }
}

export default withStyles(styles)(ModalUpgradeImages);
