// var apiServerIp = "2001:4c48:18:2::3"  // 'mt'
var apiServerIp = "2001:470:f0:3e8::c2c"  // 'sjc'
// var apiServerIp = "2402:b400:100e:100::5"  // 'ytl'

function startLinkTest() {
  // load duration and rate configs from the form inputs
  let test_duration = document.getElementById("linkDurationInput").value;
  test_duration = Number(test_duration);
  let iperf_rate = document.getElementById("linkRateInput").value;
  iperf_rate = Number(iperf_rate) + "M";
  let emails = document.getElementById("linkEmailInput").value;
  let input = {
    "test": "link healthiness",
    "deployment_test_tag": "link_health",
    "test_description": "iperf",
    "no_tcp": "no_tcp",
    "duration": test_duration,
    "rate": iperf_rate,
    "emails": emails,
  };
  console.log("Starting link test, input=" + JSON.stringify(input));
  runPyScript(input, current_test);
}

function startMultihopTest(traffic_direction) {
  let test_duration = document.getElementById("multihopDurationInput").value;
  test_duration = Number(test_duration);
  let iperf_rate = document.getElementById("multihopRateInput").value;
  iperf_rate = Number(iperf_rate) + "M";
  let multihop_sessions = document.getElementById("multihopSessionInput").value;
  multihop_sessions = Number(multihop_sessions);
  let emails = document.getElementById("multihopEmailInput").value;
  var input = {
    "test": "multihop",
    "multihop_traffic": traffic_direction,
    "deployment_test_tag": "multihop",
    "test_description": "multihop",
    "no_tcp": "",
    "duration": test_duration,
    "rate": iperf_rate,
    "emails": emails,
    "multihop_sessions": multihop_sessions,
  };
  console.log("Starting multihop test, input=" + JSON.stringify(input));
  runPyScript(input, current_test);
}

function startIgnitionTest() {
  var input = {
      "deployment_tag": "sjc_Ignition",
      "test_description": "Ignition"
  };
  runPyScript(input, "Ignition");
}

function runPyScript(input, testType) {
  $.ajax({
    type: 'POST',
    url: 'http://[' + apiServerIp + ']:5000/run_test',
    dataType: 'json',
    data: JSON.stringify( input ),
    async: true,
    success: function(response) {
      console.log('POST, response=' + JSON.stringify(response));
      handleRunResponse(response, testType);
    },
    error: function () {
        alert('ERROR in runPyScript.');
    },
  });
}

function handleRunResponse(response, test) {
  // current_test already changed
  test_status = response.test_status;
  if (test_status === "started") {
    test_start_time = response.start_time;
    test_end_time = response.end_time;
    current_test = response.current_test_type;
    end.value = "Prev. Test end: " + removeDate(test_end_time);
    start.value = "Test start: " + test_start_time;
    // reset status;
    result_refresh_time = "";
    suspend_status = false;
    alert(test + ' Test: start at ' + test_start_time);
  }
  else if (test_status === "failed") {
    alert(test + ' Test: failed');
  }
}

function getTestStatus(testType) {
  $.ajax({
    type: 'GET',
    url: 'http://[' + apiServerIp +  ']:5000/test_status',
    dataType: 'json',
    async: true,
    success: function(response) {
      console.log(
        'get status for ' + testType
          + ', response=' + JSON.stringify(response)
      );
      handleGetResponse(response, testType);
    },
    error: function () {
        alert('ERROR in getTestStatus.');
    },
  });
}

function suspendTest(status) {
  console.log("in suspendTest, status = " + status);
  if (status === "Done") {
    alert('no test running');
  }
  // if get request to /test_status shows if some test running
  else if (status == "running") {
    $.ajax({
      type: 'POST',
      url: 'http://[' + apiServerIp + ']:5000/test_suspend',
      dataType: 'json',
      async: true,
      success: function(response) {
        var test_to_cancel = response.test_type
        console.log(
          'Cancel post request, response=' + JSON.stringify(response));
        if (response.result === "success") {
          test_type.value = test_to_cancel + " suspended";
          suspend_status = true;
          start.value = "Test start ";
          alert(
            'Suspend ' + test_to_cancel + ' test: ' + response.result + "!");
        } else {
          alert(
            'Suspend ' + test_to_cancel + ' test: ' + response.result + "!");
        }
      }
    });
  }
}

// test is input test, response might include the current test type
function handleGetResponse(response, test) {
  test_status = response.test_status;
  var test_temp;
  if (current_test == "") {
    test_temp = 'Test: ';
  } else {
    test_temp = current_test + ' Test: ';
  }
  if (test == "Suspend") {
    suspendTest(test_status)
  }
  if (test == "") {
    // test empty - checking status only
    checkStatus(response);
  } else if (test == "Result") {
    // periodically refresh results
    refreshResult(response);
  } else if ((test == "Link healthiness") && (test_status == "running")) {
    test_start_time = response.start_time;
    start.value = "Test start: " + test_start_time;
    alert(test_temp + response.test_status + ', started at '
      + test_start_time + ", " + test + " Test Fails");
  } else if ((test == "Link healthiness") && (test_status == "Done")) {
    current_test = test;
    test_type.value = test + " runs";
    startLinkTest();
  } else if ((test == "Multihop") && (test_status == "running")) {
    test_start_time = response.start_time;
    start.value = "Test start: " + test_start_time;
    alert(test_temp + response.test_status + ', started at '
      + test_start_time + ", " + test + " Test Fails");
  } else if ((test == "Multihop") && (test_status == "Done")) {
    current_test = test;
    test_type.value = test + multihop_traffic + " runs";
    startMultihopTest(multihop_traffic);
  } else if ((test == "Ignition") && (test_status == "running")) {
    test_start_time = response.start_time;
    start.value = "Test start: " + test_start_time;
    alert(test_temp + response.test_status + ', started at '
      + test_start_time + ", " + test + " Test Fails");
  } else if ((test == "Ignition") && (test_status == "Done")) {
    current_test = test;
    test_type.value = test + " runs";
    startIgnitionTest();
  }
}

function checkStatus(response) {
  if (test_status == "running") {
    if(response.hasOwnProperty('current_test_type')) {
      current_test = response.current_test_type;
      test_type.value = current_test + " runs";
    }
    if(response.hasOwnProperty('start_time')) {
      test_start_time = response.start_time;
      start.value = "Test start: " + test_start_time;
      alert(current_test + ' Test: '
        + response.test_status + ', started at ' + test_start_time);
    } else {
      alert(current_test + ' Test: '
        + response.test_status + ', start_time is empty!');
    }
  } else if (test_status === "Done") {
    if(response.hasOwnProperty('end_time')) {
      test_end_time = response.end_time;
      test_type.value = current_test;
    } else {
      alert(
        'Test: ' + response.test_status + ', end_time is empty!');
    }
    if (result_refresh_time !== response.end_time) {
      end.value = "Test end: " + removeDate(test_end_time);
      result_refresh_time = response.end_time;
    }
    if (test_start_time === "") {
      alert('Previous test: ' + response.test_status
        + ', finished at ' + test_end_time);
    } else {
      if (suspend_status === false) {
        alert('Previous test: ' + response.test_status + ', finished at '
          + test_end_time + ', started at ' + test_start_time);
      } else {
        alert('Test: suspended, previous test finished at ' + test_end_time);
      }
    }
  }
}

function refreshResult(response) {
  if(response.hasOwnProperty('current_test_type')) {
    current_test = response.current_test_type
  }
  if(response.hasOwnProperty('start_time')
    && (test_start_time !== response.start_time)) {
    test_start_time = response.start_time;
    start.value = "Test start: " + test_start_time;
  }
  if(response.hasOwnProperty('end_time')
    && (test_end_time !== response.end_time)) {
    test_end_time = response.end_time;
  }
  console.log("Check result, " + current_test
    + ", test_start_time="+ test_start_time
    + ", response.start_time=" + response.start_time
    + ", response.end_time=" + response.end_time
    + ", result_refresh_time=" + result_refresh_time);
  setTimeout(function() {getTestStatus("Result");}, 6000); // update every 6s
  if (result_status === "removed") {
    loadNewData();
    console.log("Data reloaded");
  }
  console.log("test_status =" + test_status);
  if ((test_status === "running") || (suspend_status === true)) {
    end.value = "Prev. Test end: " + removeDate(test_end_time);
  }
  else if (test_status === "Done") {
    test_type.value = current_test;
    end.value = "Test end: " + removeDate(test_end_time);
  }
  if (test_status === "running") {
    test_type.value = current_test + " runs";
  }
  // if ((result_refresh_time !== response.end_time) && (test_status == "Done"))
  if ((result_refresh_time !== response.end_time))
  {
    console.log("Refreshed with new results at " + response.end_time);
    test_end_time = response.end_time;
    // when new test finished
    if (result_refresh_time !== "") {
      if (test_start_time === "") {
        alert('Test: ' + response.test_status
          + ', finished at ' + test_end_time);
      } else {
        if (suspend_status === false) {
          alert('Test: ' + response.test_status + ', finished at '
            + test_end_time + ', started at ' + test_start_time);
        } else {
          alert('Test: suspended, previous test finished at ' + test_end_time);
        }
      }
    }
    result_refresh_time = response.end_time;
    loadNewData(); // needs new result_refresh_time in the legend
  }
}

// remove date display
function removeDate (time) {
  time = time.replace(dateString, ""); // may need an extra space
  return time;
}
