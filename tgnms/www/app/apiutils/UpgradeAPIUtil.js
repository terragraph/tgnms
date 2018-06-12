/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// util class for making API calls to the node server for upgrade commands
import 'sweetalert/dist/sweetalert.css';

import Dispatcher from '../NetworkDispatcher.js';
import {
  Actions,
  UploadStatus,
  DeleteStatus,
} from '../constants/NetworkConstants.js';
import {apiServiceRequest} from './ServiceAPIUtil';
import {REVERT_UPGRADE_IMAGE_STATUS} from '../constants/UpgradeConstants.js';
import axios from 'axios';
import swal from 'sweetalert';

const UpgradeGroupType = {
  NETWORK: 20,
  NODES: 10,
};
const UpgradeReqType = {
  COMMIT_UPGRADE: 20,
  PREPARE_UPGRADE: 10,
  RESET_STATUS: 30,
};

const getErrorText = error => {
  // try to get the status text from the API response, otherwise, default to
  // the error object
  return error.response && error.response.statusText
    ? error.response.statusText
    : error;
};

const createErrorHandler = (
  title: string,
  text: string = 'Your upgrade command failed with the following message',
) => {
  return error => {
    const errorText = getErrorText(error);
    swal({
      text: `${text}:\n\n${errorText}`,
      title,
      type: 'error',
    });
  };
};

export const uploadUpgradeBinary = async (upgradeBinary, topologyName) => {
  if (!upgradeBinary) {
    return;
  }

  // dispatch an action stating that the upgrade is in progress
  Dispatcher.dispatch({
    actionType: Actions.UPGRADE_UPLOAD_STATUS,
    uploadStatus: UploadStatus.UPLOADING,
  });

  const data = new FormData();
  data.append('binary', upgradeBinary);

  const config = {
    onUploadProgress(progressEvent) {
      const percentCompleted = Math.round(
        progressEvent.loaded * 100 / progressEvent.total,
      );

      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_UPLOAD_PROGRESS,
        progress: percentCompleted,
      });
    },
  };

  try {
    // Upload binary to server, then send apiservice the url of the image
    const url = '/controller/uploadUpgradeBinary';
    const uploadResponse = await axios.post(url, data, config);
    await apiServiceRequest(
      topologyName,
      'addUpgradeImage',
      uploadResponse.data,
    );

    // dispatch an action when upload has succeeded
    Dispatcher.dispatch({
      actionType: Actions.UPGRADE_UPLOAD_STATUS,
      uploadStatus: UploadStatus.SUCCESS,
    });

    // revert the upload status after a specified interval
    setTimeout(() => {
      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_UPLOAD_STATUS,
        uploadStatus: UploadStatus.NONE,
      });
    }, REVERT_UPGRADE_IMAGE_STATUS);

    listUpgradeImages(topologyName);

    swal({
      text:
        'Your selected image has been uploaded successfully and is ' +
        'currently being prepared for use and should be ready soon. ' +
        '\n\n Please refresh the list of images periodically. If your ' +
        'image does not show up, please try again.',
      title: 'Upload Image Success',
      type: 'info',
    });
  } catch (error) {
    createErrorHandler(
      'Upload Image Failed. Please try again',
      'There was an error while uploading your selected image with ' +
        'the following message',
    )(error);
    Dispatcher.dispatch({
      actionType: Actions.UPGRADE_UPLOAD_STATUS,
      uploadStatus: UploadStatus.FAILURE,
    });
    listUpgradeImages(topologyName);
  }
};

export const listUpgradeImages = topologyName => {
  apiServiceRequest(topologyName, 'listUpgradeImages')
    .then(response => {
      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_IMAGES_LOADED,
        upgradeImages: response.data.images,
      });
    })
    .catch(error => {
      console.error('failed to fetch upgrade images', error);
      Dispatcher.dispatch({
        actionType: Actions.FETCH_UPGRADE_IMAGES_FAILED,
      });
    });
};

export const deleteUpgradeImage = (imageName, topologyName) => {
  const data = {
    name: imageName,
  };
  apiServiceRequest(topologyName, 'deleteUpgradeImage', data)
    .then(response => {
      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_DELETE_IMAGE_STATUS,
        deleteStatus: DeleteStatus.SUCCESS,
      });

      // revert the delete status after a specified interval
      setTimeout(() => {
        Dispatcher.dispatch({
          actionType: Actions.UPGRADE_DELETE_IMAGE_STATUS,
          deleteStatus: DeleteStatus.NONE,
        });
      }, REVERT_UPGRADE_IMAGE_STATUS);

      listUpgradeImages(topologyName);
    })
    .catch(error => {
      createErrorHandler(
        'Prepare upgrade failed',
        'There was an error while trying to delete your requested image',
      )(error);
      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_DELETE_IMAGE_STATUS,
        deleteStatus: DeleteStatus.FAILURE,
      });
      listUpgradeImages(topologyName);
    });
};

export const resetStatus = upgradeGroupReq => {
  const {nodes, requestId, topologyName} = upgradeGroupReq;
  const data = {
    nodes,
    ugType: UpgradeGroupType.NODES,
    urReq: {
      upgradeReqId: requestId,
      urType: UpgradeReqType.RESET_STATUS,
    },
  };
  apiServiceRequest(topologyName, 'sendUpgradeRequest', data)
    .then(response => {
      swal({
        text:
          'You have initiated the "reset status" process with requestId ' +
          requestId +
          'The status of your upgrade should be shown on the "Node Upgrade ' +
          'Status" table.',
        title: 'Reset status submitted',
        type: 'info',
      });
    })
    .catch(createErrorHandler('Reset status failed'));
};

export const prepareUpgrade = upgradeGroupReq => {
  const uri = '/controller/prepareUpgrade';
  axios
    .post(uri, upgradeGroupReq)
    .then(response => {
      swal({
        text:
          'You have initiated the "prepare upgrade" process with ' +
          `requestId ${upgradeGroupReq.requestId}` +
          '\n\n' +
          'The status of your upgrade should be shown on the "Node ' +
          'Upgrade Status" table.',
        title: 'Prepare upgrade submitted',
        type: 'info',
      });
    })
    .catch(createErrorHandler('Prepare upgrade failed'));
};

export const commitUpgrade = upgradeGroupReq => {
  const uri = '/controller/commitUpgrade';
  axios
    .post(uri, upgradeGroupReq)
    .then(response => {
      swal({
        text:
          'You have initiated the "commit upgrade" process with ' +
          `requestId ${upgradeGroupReq.requestId}` +
          '\n\n' +
          'The status of your upgrade should be shown on the "Node Upgrade ' +
          'Status" table.',
        title: 'Commit upgrade submitted',
        type: 'info',
      });
    })
    .catch(createErrorHandler('Commit upgrade failed'));
};

export const abortUpgrade = upgradeAbortReq => {
  const uri = '/controller/abortUpgrade';
  axios
    .post(uri, upgradeAbortReq)
    .then(response => {
      swal({
        text:
          'You have initiated the "abort upgrade" process successfully' +
          '\n\nThe status of your upgrade should be shown on the ' +
          '"Node Upgrade Status" table.',
        title: 'Abort upgrade(s) success',
        type: 'info',
      });
    })
    .catch(
      createErrorHandler(
        'Abort upgrade failed',
        'Your abort upgrade command failed with the following message',
      ),
    );
};
