// status params
var test_status = "";
var current_test = "";
var test_start_time = "";
var test_end_time = "";
var result_refresh_time = "";
var result_status = "";
var suspend_status = false;  // initial value is important
var testNumDisplay = 50;
var date = new Date();
var year = date.getFullYear();
var dateString = ("0" + (date.getMonth() + 1)).slice(-2)
  + "-" + ("0" + date.getDate()).slice(-2) + " ";
var multihop_traffic = "uplink";

// TODO: try to update current_test in api_server when finishing a test!!
current_test = "Link healthiness"; // initial layer
test_type.value = current_test
