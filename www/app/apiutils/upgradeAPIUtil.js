// util class for making API calls to the node server for upgrade commands
import axios from 'axios';

export const prepareUpgrade = (upgradeGroupReq) => {
  const uri = '/controller/prepareUpgrade';
  axios.post(
    uri, upgradeGroupReq
  ).then((response) => {
    swal({
      title: "Prepare upgrade submitted",
      text: `You have initiated the "prepare upgrade" process with requestId ${requestBody.requestId}

      Please run: watch tg upgrade state all
      to watch the status of your upgrade.
      `,
      type: "info"
    });
  }).catch((error) => {
    swal({
      title: "Prepare upgrade failed",
      text: `Your upgrade command failed with the following message:
      ${error.response.statusText}`,
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
      text: `You have initiated the "commit upgrade" process with requestId ${requestBody.requestId}

      Please run: watch tg upgrade state all
      to watch the status of your upgrade.
      `,
      type: "info"
    });
  }).catch((error) => {
    swal({
      title: "Prepare upgrade failed",
      text: `Your upgrade command failed with the following message:
      ${error.response.statusText}`,
      type: "error"
    });
  });
};
