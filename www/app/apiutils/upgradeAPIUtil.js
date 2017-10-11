// util class for making API calls to the node server for upgrade commands
import axios from 'axios';
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';

import { Actions, UploadStatus } from '../NetworkConstants.js';
import Dispatcher from '../NetworkDispatcher.js';

export const uploadUpgradeBinary = (upgradeBinary, topologyName) => {
  if (!upgradeBinary) {
    return;
  }

  // dispatch an action stating that the upgrade is in progress
  Dispatcher.dispatch({
    actionType: Actions.UPGRADE_UPLOAD_STATUS,
    uploadStatus: UploadStatus.UPLOADING,
  });

  const uri = '/controller/uploadUpgradeBinary';

  let data = new FormData();
  data.append('binary', upgradeBinary);
  data.append('topologyName', topologyName);

  const config = {
    onUploadProgress: function(progressEvent) {
      var percentCompleted = Math.round( (progressEvent.loaded * 100) / progressEvent.total );
      console.log('uploading: ', percentCompleted);

      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_UPLOAD_PROGRESS,
        progress: percentCompleted
      });
    }
  };

  axios.post(
    uri, data, config
  ).then((response) => {
    // dispatch an action when upload has succeeded
    Dispatcher.dispatch({
      actionType: Actions.UPGRADE_UPLOAD_STATUS,
      uploadStatus: UploadStatus.SUCCESS
    });

    // revert the upload status after 5 seconds
    setTimeout(() => {
      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_UPLOAD_STATUS,
        uploadStatus: UploadStatus.NONE
      });
    }, 5000);

    listUpgradeImages(topologyName);

    swal({
      title: "Upload Image Success",
      text: `Your selected image has been uploaded successfully and is currently being prepared for use
      and should be ready soon.

      Please refresh the list of images periodically. If your image does not show up, please try again.
      `,
      type: "info"
    });
  }).catch((error) => {
    Dispatcher.dispatch({
      actionType: Actions.UPGRADE_UPLOAD_STATUS,
      uploadStatus: UploadStatus.FAILURE
    });

    listUpgradeImages(topologyName);
  })
};

export const listUpgradeImages = (topologyName) => {
  const uri = `/controller/listUpgradeImages/${topologyName}`;

  axios.get(uri).then((response) => {
    Dispatcher.dispatch({
      actionType: Actions.UPGRADE_IMAGES_LOADED,
      upgradeImages: response.data.images
    });
  }).catch((error) => {
    // TODO: Kelvin: swal
  })
};

export const deleteUpgradeImage = (imageName, topologyName) => {
  const uri = `controller/deleteUpgradeImage/${topologyName}/${imageName}`;

  axios.get(uri).then((response) => {
    listUpgradeImages(topologyName);
  }).catch((error) => {
    listUpgradeImages(topologyName);
    // TODO: Kelvin: swal
  })
};

export const prepareUpgrade = (upgradeGroupReq) => {
  const uri = '/controller/prepareUpgrade';
  axios.post(
    uri, upgradeGroupReq
  ).then((response) => {
    swal({
      title: "Prepare upgrade submitted",
      text: `You have initiated the "prepare upgrade" process with requestId ${response.requestId}

      Please run: watch tg upgrade state all
      to watch the status of your upgrade.
      `,
      type: "info"
    });
  }).catch((error) => {
    // try to get the status text from the API response, otherwise, default to the error object
    const errorText = (!!error.response && !!error.response.statusText) ?
      error.response.statusText : error;

    swal({
      title: "Prepare upgrade failed",
      text: `Your upgrade command failed with the following message:
      ${errorText}`,
      type: "error"
    });
  });
};

export const commitUpgrade = (upgradeGroupReq) => {
  const uri = '/controller/commitUpgrade';
  axios.post(
    uri, upgradeGroupReq
  ).then((response) => {
    swal({
      title: "Commit upgrade submitted",
      text: `You have initiated the "commit upgrade" process with requestId ${response.requestId}

      Please run: watch tg upgrade state all
      to watch the status of your upgrade.
      `,
      type: "info"
    });
  }).catch((error) => {
    // try to get the status text from the API response, otherwise, default to the error object
    const errorText = (!!error.response && !!error.response.statusText) ?
      error.response.statusText : error;

    swal({
      title: "Prepare upgrade failed",
      text: `Your upgrade command failed with the following message:
      ${errorText}`,
      type: "error"
    });
  });
};
