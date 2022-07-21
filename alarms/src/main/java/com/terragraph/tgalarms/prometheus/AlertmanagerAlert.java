/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.terragraph.tgalarms.prometheus;

import java.util.HashMap;
import java.util.Map;

/**
 * Schema representing a "postableAlert" in the Prometheus Alertmanager v2 API.
 */
public class AlertmanagerAlert {
	public String startsAt;
	public String endsAt;
	public Map<String, String> annotations = new HashMap<>();
	public Map<String, String> labels = new HashMap<>();
	public String generatorURL;
}
