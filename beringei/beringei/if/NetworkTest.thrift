/*
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 */

namespace cpp2 facebook.terragraph.thrift
namespace py terragraph_thrift.network_test

// label: Name of the Parameter inside Drop Down
// value: Value of the Parameter inside Drop Down
struct DropDown {
  1: string label;
  2: string value;
}

// Minimum value of the Parameter
// Maximum value of the Parameter
struct Box {
  1: optional double min_value;
  2: optional double max_value;
}

// dropdown: list of Parameter inside Drop Down
// range: Range of the Parameter
// unit: Unit of the Parameter
// type: Type of the Parameter
struct Meta {
  1: optional list<DropDown> dropdown;
  2: optional Box range
  3: optional string unit;
  4: optional string type;
}

// label: Name of the Parameter
// value: Default value of the parameter when requesting help; Value of the Parameter when starting test
// meta: Metadata of the Parameter
struct Parameter {
  1: string label;
  2: string value;
  3: optional Meta meta;
}

// url_ext: URL extension associated with Start Test
// parameters: list of Parameters needed to trigger Network Test
struct StartTest {
  1: list<Parameter> parameters;
  2: optional string url_ext;
}

// url_ext: URL extension associated with Start Test
struct StopTest {
  1: optional string url_ext;
}

// start_test: List of Help information about different tests that
//             are supported by Network Test
// stop_test: Help information needed to trigger Stop Network Test
struct Help {
  1: list<StartTest> start_test;
  2: StopTest stop_test;
}
