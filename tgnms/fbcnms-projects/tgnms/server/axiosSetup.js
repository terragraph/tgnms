/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as http from 'http';
import * as https from 'https';
import axios from 'axios';
import {envBool} from './helpers/configHelpers';

// AgentOptions is exposed in axios's flow-type
type AgentOptions = {|
  keepAlive?: boolean,
  keepAliveMsecs?: number,
  maxSockets?: number,
  maxFreeSockets?: number,
  family?: number,
|};
export default function axiosSetup() {
  const agentOptions: AgentOptions = {keepAlive: true};
  /**
   * When querying public dns (like graph.facebook.com), it's possible to
   * receive both A and AAAA records. When hosted in an ipv4-only or ipv6-only
   * environment, the address family must be specified to prevent networking
   * using the wrong family.
   */
  const forceIPV4 = envBool(process.env.FORCE_IPV4);
  const forceIPV6 = envBool(process.env.FORCE_IPV6);
  if (forceIPV6 === true) {
    agentOptions.family = 6;
  } else if (forceIPV4 === true) {
    agentOptions.family = 4;
  }
  axios.defaults.httpAgent = new http.Agent(agentOptions);
  axios.defaults.httpsAgent = new https.Agent(agentOptions);
}
