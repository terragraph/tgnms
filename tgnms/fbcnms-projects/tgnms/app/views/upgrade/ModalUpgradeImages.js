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
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
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
} from '@fbcnms/tg-nms/app/constants/UpgradeConstants';
import {
  DownloadStatus as SoftwarePortalDownloadStatus,
  getWebSocketGroupName,
} from '@fbcnms/tg-nms/shared/dto/SoftwarePortalDownload';
import {WebSocketMessage} from '@fbcnms/tg-nms/shared/dto/WebSockets';
import {
  apiServiceRequest,
  apiServiceRequestWithConfirmation,
  getErrorTextFromE2EAck,
} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {
  fetchSoftwarePortalImages,
  fetchUpgradeImages,
} from '@fbcnms/tg-nms/app/helpers/UpgradeHelpers';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {useWebSocketGroup} from '@fbcnms/tg-nms/app/contexts/WebSocketContext';
import {withStyles} from '@material-ui/core/styles';
import type {SoftwareImageType} from '@fbcnms/tg-nms/app/helpers/UpgradeHelpers';
import type {
  SoftwarePortalDownloadMessage,
  ImageIdentifier as SoftwarePortalImageIdentifier,
} from '@fbcnms/tg-nms/shared/dto/SoftwarePortalDownload';

import type {UpgradeImageType} from '@fbcnms/tg-nms/shared/types/Controller';

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
  noCustomImagesText: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
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
  listItemIcon: {
    marginRight: theme.spacing(2),
    minWidth: 'unset',
  },
});

type Props = {|
  classes: {[key: string]: string},
  networkName: string,
|};

type State = {|
  isOpen: boolean,
  upgradeImages: Array<SoftwareImageType>,
  softwarePortalImages: Array<SoftwareImageType>,
  uploadProgress: number,
  uploadStatus: string,
  softwarePortalUpload: ?SoftwarePortalImageIdentifier,
|};

class ModalUpgradeImages extends React.Component<Props, State> {
  _intervalID: IntervalID = setInterval(
    this.handleFetchImages,
    UPGRADE_IMAGE_REFRESH_INTERVAL,
  );

  state = {
    isOpen: false,
    // upgrade images properties
    upgradeImages: [],
    softwarePortalImages: [],
    uploadProgress: 0,
    uploadStatus: UploadStatus.NONE,
    softwarePortalUpload: null,
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
      this.imageUploadComplete();
    }
  };

  imageUploadComplete() {
    // Revert upload status to none after brief delay
    setTimeout(() => {
      this.setState({uploadStatus: UploadStatus.NONE});
    }, REVERT_UPGRADE_IMAGE_STATUS);

    this.handleFetchImages();
  }

  handleDeleteImage(image: UpgradeImageType) {
    // Delete the selected image
    const {networkName} = this.props;
    const data = {name: image.name};

    apiServiceRequestWithConfirmation(networkName, 'delUpgradeImage', data, {
      desc: `The following image will be deleted from the server:
        <p><em>${image.name || ''}</em></p>`,
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

  handleCopyMagnetURI(magnetUri: string) {
    // Copy the magnet URI for the selected image
    copy(magnetUri);
  }

  handleSoftwarePortalUpload = async (image: SoftwareImageType) => {
    const {networkName} = this.props;
    const softwarePortalUpload: SoftwarePortalImageIdentifier = {
      release: image.versionNumber || '',
      name: image.fileName || '',
      networkName: networkName,
    };
    const response = await axios.post(
      '/controller/softwarePortalImage',
      softwarePortalUpload,
    );
    try {
      await apiServiceRequest(networkName, 'addUpgradeImage', response.data);
      this.setState({
        softwarePortalUpload,
      });
    } catch (err) {
      swal({
        type: 'error',
        title: 'Uploading from Software Portal failed',
        text: `Image upload command failed with the following message:\n\n${err.message}.`,
      });
    }
  };

  handleSoftwarePortalUploadProgress = (progress: number) => {
    this.setState({
      uploadStatus: UploadStatus.UPLOADING,
      uploadProgress: progress,
    });
  };

  handleSoftwarePortalUploadFinished = () => {
    this.setState({
      uploadStatus: UploadStatus.SUCCESS,
      uploadProgress: 0,
    });
    this.imageUploadComplete();
  };

  handleSoftwarePortalUploadError = () => {
    this.setState({
      uploadStatus: UploadStatus.FAILURE,
      uploadProgress: 0,
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
              <Typography variant="subtitle1">Upload Custom Binary</Typography>
              <input
                className={classes.fileInput}
                accept=".bin,.img"
                onChange={this.handleUploadImage}
                type="file"
              />
            </Button>
            <Tooltip title="Refresh List" placement="top">
              <IconButton
                className={classNames(classes.rightIcon, classes.button)}
                onClick={this.handleFetchImages}
                data-testid="refresh-images">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </>
        );
    }
  };

  render() {
    const {classes} = this.props;
    const {isOpen, upgradeImages, softwarePortalImages} = this.state;
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
          data-testid="upgrade-modal"
          modalTitle={this.renderUploadProgressBar()}
          modalContent={
            <>
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
                    menuItems={[
                      <MenuItem
                        key="handleupload"
                        onClick={this.handleSoftwarePortalUpload}>
                        <ListItemIcon classes={{root: classes.listItemIcon}}>
                          <LinkIcon />
                        </ListItemIcon>
                        <ListItemText primary="Upload to Controller" />
                      </MenuItem>,
                    ]}
                  />
                  {this.state.softwarePortalUpload && (
                    <SoftwarePortalUploadWatcher
                      uploadRequest={this.state.softwarePortalUpload}
                      onUploadProgress={this.handleSoftwarePortalUploadProgress}
                      onUploadFinished={this.handleSoftwarePortalUploadFinished}
                      onUploadError={this.handleSoftwarePortalUploadError}
                    />
                  )}
                </>
              ) : null}

              <>
                <Typography variant="subtitle1">
                  Custom Uploaded Images
                </Typography>
                {upgradeImages.length === 0 ? (
                  <Typography
                    className={classes.noCustomImagesText}
                    variant="body2">
                    No custom images uploaded
                  </Typography>
                ) : (
                  <ModalImageList
                    upgradeImages={upgradeImages}
                    menuItems={[
                      <MenuItem
                        key="copymagneturi"
                        onClick={(image: UpgradeImageType) => {
                          this.handleCopyMagnetURI(image.magnetUri);
                        }}>
                        <ListItemIcon classes={{root: classes.listItemIcon}}>
                          <LinkIcon />
                        </ListItemIcon>
                        <ListItemText primary="Copy Magnet URI" />
                      </MenuItem>,
                      <MenuItem
                        key="deleteimage"
                        onClick={(image: UpgradeImageType) => {
                          this.handleDeleteImage(image);
                        }}>
                        <ListItemIcon classes={{root: classes.listItemIcon}}>
                          <DeleteForeverIcon className={classes.deleteIcon} />
                        </ListItemIcon>
                        <ListItemText primary="Delete Image" />
                      </MenuItem>,
                    ]}
                  />
                )}
              </>
            </>
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

function SoftwarePortalUploadWatcher({
  uploadRequest,
  onUploadProgress,
  onUploadFinished,
  onUploadError,
}: {
  uploadRequest: SoftwarePortalImageIdentifier,
  onUploadProgress: (progress: number) => any,
  onUploadError: () => any,
  onUploadFinished: () => any,
}) {
  const groupName = React.useMemo(() => getWebSocketGroupName(uploadRequest), [
    uploadRequest,
  ]);
  useWebSocketGroup(
    groupName,
    ({payload}: WebSocketMessage<SoftwarePortalDownloadMessage>) => {
      if (payload.status === SoftwarePortalDownloadStatus.DOWNLOADING) {
        const progress =
          typeof payload.progressPct === 'number'
            ? payload.progressPct
            : parseFloat(payload.progressPct);
        onUploadProgress(Math.round(progress * 100));
      } else if (payload.status === SoftwarePortalDownloadStatus.FINISHED) {
        onUploadFinished();
      } else if (payload.status === SoftwarePortalDownloadStatus.ERROR) {
        onUploadError();
      }
    },
  );
  return null;
}

export default withStyles(styles)(ModalUpgradeImages);
