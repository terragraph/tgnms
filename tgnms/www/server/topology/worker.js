/*
 * ZMQ controller/aggregator refresh process
 * @format
 */
const ZMQ_TIMEOUT_MS = 4000;

const EventEmitter = require('events');

const axios = require('axios');
const isIp = require('is-ip');
const process = require('process');

// main message loop from primary process
process.on('message', msg => {
  if (!msg.type) {
    console.error('Received unknown message', msg);
  }

  const getErrorHandler = function(type) {
    return (error) => {
        console.error(error);
    };
  };

  // wait for a message to start polling
  switch (msg.type) {
    case 'poll':
      // expect a list of IP addresses
      msg.topologies.forEach(topology => {
        const getSuccessHandler = function(type, fieldName) {
          return ([success, responseTime, data]) => {
            process.send({
              name: topology.name,
              type: type,
              success: success,
              response_time: responseTime,
              controller_ip: topology.controller_ip_active,
              [fieldName]: success ? data : null,
            });
          };
        };
        apiServiceRequest(topology, 'getTopology')
          .then(getSuccessHandler('topology_update', 'topology'))
          .catch(getErrorHandler('topology_update'));
        apiServiceRequest(topology, 'getCtrlStatusDump')
          .then(getSuccessHandler('status_dump_update', 'status_dump'))
          .catch(getErrorHandler('status_dump_update'));
        apiServiceRequest(topology, 'getIgnitionState')
          .then(getSuccessHandler('ignition_state', 'ignition_state'))
          .catch(getErrorHandler('ignition_state'));
        apiServiceRequest(topology, 'getUpgradeState')
          .then(getSuccessHandler('upgrade_state', 'upgradeState'))
          .catch(getErrorHandler('upgrade_state'));
        apiServiceRequest(topology, 'getHighAvailabilityState')
          .then(getSuccessHandler('bstar_state', 'bstar_fsm'))
          .catch(getErrorHandler('bstar_state'));
        if (topology.controller_ip_passive) {
          apiServiceRequest(topology, 'BStarGetState')
            .then(([success, responseTime, data]) => {
              // recvmsg.mType = BSTAR_FSM
              process.send({
                name: topology.name,
                type: 'bstar_state',
                success: success,
                response_time: responseTime,
                controller_ip: topology.controller_ip_passive,
                bstar_fsm: success ? data : null,
              });
            });
        }
      });
      break;
    case 'scan_poll':
      msg.topologies.forEach(topology => {
        const scanStatusPostData = {
          isConcise: false,
        };
        apiServiceRequest(topology, 'getScanStatus', scanStatusPostData)
          .then(([success, responseTime, data]) => {
            process.send({
              name: topology.name,
              scan_status: success ? data : null,
              success: success && data,
              type: 'scan_status',
            });

            const clearScanEnable = true; // for development
            if (!success || !data || !clearScanEnable) {
              return;
            }
            if (Object.keys(data.scans).length === 0) {
              return;
            }

            // this clears the scan memory from the controller
            const statusKeys = Object.keys(data.scans);
            const scanResetPostData = {
              tokenFrom: Math.min.apply(null, statusKeys),
              tokenTo: Math.max.apply(null, statusKeys),
            };
            apiServiceRequest(topology, 'resetScanStatus', scanResetPostData)
              .then(_ => console.log('Reset scan status success'))
              .catch(getErrorHandler('scan_status_reset'));
          })
          .catch(getErrorHandler('scan_status'));
      });
      break;
    default:
      console.error('No handler for msg type', msg.type);
  }
});


function apiServiceRequest(topology, apiMethod, data, config) {
  const controller_ip = topology.controller_ip_active;
  const baseUrl = topology.apiservice_baseurl || (
    isIp.v6(controller_ip)
      ? 'http://[' + controller_ip + ']:8080'
      : 'http://' + controller_ip + ':8080'
  );
  const postData = data || {};
  // All apiservice requests are POST, and expect at least an empty dict.
  return new Promise((resolve, reject) => {
    const startTimer = new Date();
    const url = `${baseUrl}/api/${apiMethod}`;
    retryAxios([100, 500, 1000], axios.post, url, postData, config).then(response => {
      const endTimer = new Date();
      const responseTime = endTimer - startTimer;
      const success = true;
      resolve([success, responseTime, response.data]);
    })
    .catch(error => {
      if (error.response) {
        console.error('Received status ' + error.response.status +
                      ' for url ' + url);
      } else {
        console.error(error.message);
      }
      const endTimer = new Date();
      const responseTime = endTimer - startTimer;
      const success = false;
      const data = error.response ? error.response.data : null;
      resolve([success, responseTime, data]);
    });
  });
}

const retryAxios = async (delays, axiosFunc, ...axiosArgs) => {
  // Extract the iterator from the iterable.
  const timeout = ms => new Promise(res => setTimeout(res, ms))
  const iterator = delays[Symbol.iterator]();
  while (true) {
    try {
      // Always call the service at least once.
      return await axiosFunc(...axiosArgs);
    } catch (error) {
      const { done, value } = iterator.next();
      if (!done && error.response && error.response.status === 400) {
        console.log('retrying ' + value);
        await timeout(value);
      } else {
        // The error is not retriable or the iterable is exhausted.
        throw error;
      }
    }
  }
};

module.exports = {
};
