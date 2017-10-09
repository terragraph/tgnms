// util class for making API calls to the node server for upgrade commands
import axios from 'axios';
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';

import { Actions } from '../NetworkConstants.js';
import Dispatcher from '../NetworkDispatcher.js';

export const uploadUpgradeBinary = (upgradeBinary) => {
  if (!upgradeBinary) {
    // TODO: Kelvin: swal
    return;
  }

  const uri = '/controller/uploadUpgradeBinary';

  let data = new FormData();
  data.append('binary', upgradeBinary);
  axios.post(
    uri, data
  ).then((response) => {
    listUpgradeImages();
  }).catch((error) => {
    listUpgradeImages();
    // TODO: Kelvin: swal
  })
};

export const listUpgradeImages = () => {
  const uri = '/controller/listUpgradeImages';

  axios.get(uri).then((response) => {
    Dispatcher.dispatch({
      actionType: Actions.UPGRADE_IMAGES_LOADED,
      upgradeImages: response.data.images
    });
  }).catch((error) => {
    // TODO: Kelvin: swal
  })
};

export const deleteUpgradeImage = (imageName) => {
  const uri = '/controller/deleteUpgradeImage/' + imageName;

  axios.get(uri).then((response) => {
    listUpgradeImages();
  }).catch((error) => {
    listUpgradeImages();
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
