// util class for making API calls to the node server for upgrade commands
import axios from "axios";
import swal from "sweetalert";
import "sweetalert/dist/sweetalert.css";

import { REVERT_UPGRADE_IMAGE_STATUS } from "../constants/UpgradeConstants.js";
import {
  Actions,
  UploadStatus,
  DeleteStatus
} from "../constants/NetworkConstants.js";
import Dispatcher from "../NetworkDispatcher.js";

const getErrorText = error => {
  // try to get the status text from the API response, otherwise, default to the error object
  return error.response && error.response.statusText
    ? error.response.statusText
    : error;
};

export const uploadUpgradeBinary = (upgradeBinary, topologyName) => {
  if (!upgradeBinary) {
    return;
  }

  // dispatch an action stating that the upgrade is in progress
  Dispatcher.dispatch({
    actionType: Actions.UPGRADE_UPLOAD_STATUS,
    uploadStatus: UploadStatus.UPLOADING
  });

  let data = new FormData();
  data.append("binary", upgradeBinary);
  data.append("topologyName", topologyName);

  const config = {
    onUploadProgress: function(progressEvent) {
      var percentCompleted = Math.round(
        progressEvent.loaded * 100 / progressEvent.total
      );

      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_UPLOAD_PROGRESS,
        progress: percentCompleted
      });
    }
  };

  const uri = "/controller/uploadUpgradeBinary";
  axios
    .post(uri, data, config)
    .then(response => {
      // dispatch an action when upload has succeeded
      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_UPLOAD_STATUS,
        uploadStatus: UploadStatus.SUCCESS
      });

      // revert the upload status after a specified interval
      setTimeout(() => {
        Dispatcher.dispatch({
          actionType: Actions.UPGRADE_UPLOAD_STATUS,
          uploadStatus: UploadStatus.NONE
        });
      }, REVERT_UPGRADE_IMAGE_STATUS);

      listUpgradeImages(topologyName);

      swal({
        title: "Upload Image Success",
        text: `Your selected image has been uploaded successfully and is currently being prepared for use
      and should be ready soon.

      Please refresh the list of images periodically. If your image does not show up, please try again.
      `,
        type: "info"
      });
    })
    .catch(error => {
      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_UPLOAD_STATUS,
        uploadStatus: UploadStatus.FAILURE
      });

      listUpgradeImages(topologyName);

      const errorText = getErrorText(error);
      swal({
        title: "Upload Image Failed",
        text: `There was an error while uploading your selected image with the following message: ${errorText}

      Please try again.
      `,
        type: "error"
      });
    });
};

export const listUpgradeImages = topologyName => {
  const uri = `/controller/listUpgradeImages/${topologyName}`;

  axios
    .get(uri)
    .then(response => {
      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_IMAGES_LOADED,
        upgradeImages: response.data.images
      });
    })
    .catch(error => {
      console.error("failed to fetch upgrade images", error);
      Dispatcher.dispatch({
        actionType: Actions.FETCH_UPGRADE_IMAGES_FAILED
      });
    });
};

export const deleteUpgradeImage = (imageName, topologyName) => {
  const uri = `controller/deleteUpgradeImage/${topologyName}/${imageName}`;

  axios
    .get(uri)
    .then(response => {
      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_DELETE_IMAGE_STATUS,
        deleteStatus: DeleteStatus.SUCCESS
      });

      // revert the delete status after a specified interval
      setTimeout(() => {
        Dispatcher.dispatch({
          actionType: Actions.UPGRADE_DELETE_IMAGE_STATUS,
          deleteStatus: DeleteStatus.NONE
        });
      }, REVERT_UPGRADE_IMAGE_STATUS);

      listUpgradeImages(topologyName);
    })
    .catch(error => {
      const errorText = getErrorText(error);

      swal({
        title: "Prepare upgrade failed",
        text: `There was an error while trying to delete your requested image.

      ${errorText}`,
        type: "error"
      });

      Dispatcher.dispatch({
        actionType: Actions.UPGRADE_DELETE_IMAGE_STATUS,
        deleteStatus: DeleteStatus.FAILURE
      });
      listUpgradeImages(topologyName);
    });
};

export const resetStatus = upgradeGroupReq => {
  const uri = "/controller/resetStatus";
  axios
    .post(uri, upgradeGroupReq)
    .then(response => {
      swal({
        title: "Reset status submitted",
        text: `You have initiated the "reset status" process with requestId ${
          upgradeGroupReq.requestId
        }

      The status of your upgrade should be shown on the "Node Upgrade Status" table.
      `,
        type: "info"
      });
    })
    .catch(error => {
      const errorText = getErrorText(error);

      swal({
        title: "Reset status failed",
        text: `Your upgrade command failed with the following message:
      ${errorText}`,
        type: "error"
      });
    });
};

export const prepareUpgrade = upgradeGroupReq => {
  const uri = "/controller/prepareUpgrade";
  axios
    .post(uri, upgradeGroupReq)
    .then(response => {
      swal({
        title: "Prepare upgrade submitted",
        text: `You have initiated the "prepare upgrade" process with requestId ${
          upgradeGroupReq.requestId
        }

      The status of your upgrade should be shown on the "Node Upgrade Status" table.
      `,
        type: "info"
      });
    })
    .catch(error => {
      const errorText = getErrorText(error);

      swal({
        title: "Prepare upgrade failed",
        text: `Your upgrade command failed with the following message:
      ${errorText}`,
        type: "error"
      });
    });
};

export const commitUpgrade = upgradeGroupReq => {
  const uri = "/controller/commitUpgrade";
  axios
    .post(uri, upgradeGroupReq)
    .then(response => {
      swal({
        title: "Commit upgrade submitted",
        text: `You have initiated the "commit upgrade" process with requestId ${
          upgradeGroupReq.requestId
        }

      The status of your upgrade should be shown on the "Node Upgrade Status" table.
      `,
        type: "info"
      });
    })
    .catch(error => {
      const errorText = getErrorText(error);

      swal({
        title: "Commit upgrade failed",
        text: `Your upgrade command failed with the following message:
      ${errorText}`,
        type: "error"
      });
    });
};

export const abortUpgrade = upgradeAbortReq => {
  const uri = "/controller/abortUpgrade";
  axios
    .post(uri, upgradeAbortReq)
    .then(response => {
      swal({
        title: "Abort upgrade(s) success",
        text: `You have initiated the "abort upgrade" process successfully

      The status of your upgrade should be shown on the "Node Upgrade Status" table.
      `,
        type: "info"
      });
    })
    .catch(error => {
      const errorText = getErrorText(error);

      swal({
        title: "Abort upgrade failed",
        text: `Your abort upgrade command failed with the following message:
      ${errorText}`,
        type: "error"
      });
    });
};
