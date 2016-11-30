import React from 'react';
import ReactDOM from 'react-dom';
import NetworkSplit from './NetworkSplit.js';
import NetworkMap from './NetworkMap.js';

ReactDOM.render(
  <NetworkSplit>
    <NetworkMap />
  </NetworkSplit>, document.getElementById('root'));
