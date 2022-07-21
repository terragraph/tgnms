/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

namespace cpp2 facebook.terragraph.thrift
namespace py terragraph_thrift.network_test

// DELETE means completely delete the scheduled row
// SUSPEND means keep the row but don't include it in the schedule
// ENABLE enables if a row is SUSPENDed
enum ModifyInstruction {
  DELETE = 100
  SUSPEND = 200
  ENABLE = 300
}

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

// pop: Name of Pop node
// node: Name of Node
struct PopToNodeLink{
  1: string pop;
  2: string node;
}

// dropdown: list of Parameter inside Drop Down
// range: Range of the Parameter
// pop_to_node_link: Pop to Node link info
// ui_type: [dropdown/range/pop_to_node_link]
// unit: Unit of the Parameter
// type: Type of the Parameter
struct Meta {
  1: optional list<DropDown> dropdown;
  2: optional Box range;
  3: optional PopToNodeLink pop_to_node_link;
  4: optional string ui_type;
  5: optional string unit;
  6: optional string type;
}

// label: Name of the Parameter
// key: key of the Parameter
// value: Default value of the parameter when requesting help; Value of the Parameter when starting test
// meta: Metadata of the Parameter
struct Parameter {
  1: string key;
  2: string value;
  3: optional string label;
  4: optional Meta meta;
}

// url_ext: URL extension associated with Start Test
// parameters: list of Parameters needed to trigger Network Test
// label: Name of the Test
// test_code: value of the test_code parameter for the Test
struct StartTest {
  1: optional string label;
  2: optional double test_code;
  3: optional string url_ext;
  4: list<Parameter> parameters;
}

// url_ext: URL extension associated with Start Test
// topology_id: id associated with this network
struct StopTest {
  1: optional string url_ext;
  2: i32 topology_id;
}


// delete or suspend a schedule row or all rows
// if test_schedule_id is present, then instruction applies only to this row
// elif topology_id is present, instruction applies to all tests for this network
// instruction is whether to delete, disable, or enable the specified test(s)
struct ModifyScheduleRow {
  1: optional string url_ext;
  2: optional i32 test_scheduled_id;
  3: optional i32 topology_id;
  4: Parameter instruction;
}

// start_test: List of Help information about different tests that
//             are supported by Network Test
// stop_test: Help information needed to trigger Stop Network Test
struct Help {
  1: list<StartTest> start_test;
  2: StopTest stop_test;
  3: ModifyScheduleRow modify_sched;
}
