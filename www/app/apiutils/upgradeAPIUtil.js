// util class for making API calls to the node server for upgrade commands
import axios from 'axios';

export const prepareUpgrade = (upgradeGroupReq) => {
  const uri = '/controller/prepareUpgrade';
  axios.post(
    uri, upgradeGroupReq
  ).then((response) => {
    console.log('initiated prepare upgrade command!', response);
    // response.data has what we actually want
  }).catch((error) => {
    console.log('something is wrong!', error);
  });
};

export const commitUpgrade = (upgradeGroupReq) => {
  const uri = '/controller/commitUpgrade';
  axios.post(
    uri, upgradeGroupReq
  ).then((response) => {
    console.log('we got something back!', response);
  }).catch((error) => {
    console.log('something is wrong!', error);
  });
};
