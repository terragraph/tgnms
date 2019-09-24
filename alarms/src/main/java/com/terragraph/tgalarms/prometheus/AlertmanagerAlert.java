/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
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
