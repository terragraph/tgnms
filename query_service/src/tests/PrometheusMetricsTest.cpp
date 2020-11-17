/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include <gtest/gtest.h>

#define private public

#include "../PrometheusUtils.h"

using namespace ::testing;

using facebook::terragraph::stats::PrometheusUtils;

class PrometheusMetricsTest : public testing::Test {};

// Verify names based on Prometheus data model
// https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels
// It may contain ASCII letters and digits, as well as underscores and colons.
// It must match the regex [a-zA-Z_:][a-zA-Z0-9_:]*.
TEST_F(PrometheusMetricsTest, MetricNames) {
  std::string expectedLabel = "link_link_1_link_2";
  // verify character replacements
  ASSERT_EQ(
      PrometheusUtils::formatPrometheusMetricName("link-link-1-link-2"),
      expectedLabel);
  ASSERT_EQ(
      PrometheusUtils::formatPrometheusMetricName("link-link 1-link 2"),
      expectedLabel);
  ASSERT_EQ(
      PrometheusUtils::formatPrometheusMetricName("link-link@1-link@2"),
      expectedLabel);
  ASSERT_EQ(
      PrometheusUtils::formatPrometheusMetricName("link-link~1-link~2"),
      expectedLabel);

  expectedLabel = "link_link:1_link:2";
  // colons are allowed in metric names
  ASSERT_EQ(
      PrometheusUtils::formatPrometheusMetricName("link-link:1-link:2"),
      expectedLabel);
}
