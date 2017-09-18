// util class for making API calls to the node server for upgrade commands
import axios from 'axios';

export const prepareUpgrade = (testData) => {
  const uri = '/controller/prepareUpgrade';
  axios.post(uri, {
    testData
  }).then((response) => {
    console.log('we got something back!', response);
  }).catch((error) => {
    console.log('something is wrong!', error);
  });
};
