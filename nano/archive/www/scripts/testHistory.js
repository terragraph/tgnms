var apiServerIp = "2001:4c48:18:2::3"  // MT
// var apiServerIp = "2001:470:f0:3e8::c2c"  // SJC

function fetchTestHistory(testType) {
  let info = {
    "test": testType
  }
  $.ajax({
    type: 'POST',
    url: 'http://[' + apiServerIp + ']:5000/test_history',
    dataType: 'json',
    data: JSON.stringify( info ),
    async: true,
    success: function(response) {
      handleTestHistoryResponse(response, testType);
    },
    error: function () {
        alert('ERROR in fetchTestHistory.');
    },
  });
}

function handleTestHistoryResponse(responseJson, testType) {
  for (let p in responseJson) {
    if (responseJson.hasOwnProperty(p)) {
      // console.log(p + " : finished at " + responseJson[p]);
    }
  }
  let testIdTemp;
  let testContent;
  let testTime;
  if (testType == "Link healthiness") {
    testIdTemp = "link_test_";
    testContent = "link test: "
  } else if (testType == "Multihop") {
    testIdTemp = "multihop_test_";
    testContent = "multihop test: "
  } else if (testType == "Ignition") {
    testIdTemp = "ignition_test_";
    testContent = "ignition test: "
  }
  for (let i = 1; i <= testNumDisplay; i ++) {
    let testTemp = testIdTemp + i;
    var btnTemp = document.getElementById(testTemp);
    if (responseJson.hasOwnProperty('Test ' + i)) {
      testTime = removeYear(responseJson['Test ' + i]);
      btnTemp.value = testContent + testTime;
    } else {
      btnTemp.value = testContent + "";
    }
  }
}

// remove year display in the test history
function removeYear (time) {
  let yearTemp = String(year) + "-";
  time = time.replace(yearTemp, "");
  return time;
}

// add year to time when loading test record from MongoDB
function addYear (time) {
  let yearTemp = year + '-';
  return (yearTemp + time);
}

function loadHistoryBtnOperation (testType) {
  var testContent;
  var testTemp;
  if (testType === "Link healthiness") {
    testContent = "link test: ";
    testTemp = "link_test_";
  } else if (testType === "Multihop") {
    testContent = "multihop test: ";
    testTemp = "multihop_test_";
  } else if (testType === "Ignition") {
    testContent = "ignition test: ";
    testTemp = "ignition_test_";
  }
  for (let idx = 1; idx <= testNumDisplay; idx ++) {
    $('#' + testTemp + idx).click( function() {
      let suspendVal = confirm("Reload previous test?")
      if (suspendVal == true) {
        loadTestResult(testTemp, idx);
      }
    });
  }
}

function loadTestResult (testTemp, testIndex) {
  let testId = testTemp + testIndex;
  let btn = document.getElementById(testId);
  var testType;
  if (testTemp === "link_test_") {
    testContent = "link test: ";
    testType = "Link healthiness";
  } else if (testTemp === "multihop_test_") {
    testContent = "multihop test: ";
    testType = "Multihop";
  } else if (testTemp === "ignition_test_") {
    testContent = "ignition test: ";
    testType = "Ignition";
  }
  let testTime = btn.value.replace(testContent, "");
  console.log("load " + testType + " result, from time= " + testTime);
  testTime = addYear(testTime);
  loadTest(testType, testTime)
}

function loadTest(testType, testTime) {
  let info = {
    "test": testType,
    "time": testTime
  }
  console.log("in loadTest, send out " + JSON.stringify(info));
  $.ajax({
    type: 'POST',
    url: 'http://[' + apiServerIp + ']:5000/load_test',
    dataType: 'json',
    data: JSON.stringify( info ),
    async: true,
    success: function(response) {
      handleLoadTestResponse(response, testType);
    },
    error: function () {
        alert('ERROR in loadTest.');
    },
  });
}

function handleLoadTestResponse(responseJson, testType) {
  let load_status = responseJson.load_test_status;
  console.log("responseJson=" + String(responseJson.time));
  if (load_status === "success") {
    let testTime = responseJson.time;
    alert("Reload " + testType + " test from " + testTime);
    // window.open("/test_history", '_blank');
    window.location.href = '/test_history';
  }
  else if (load_status === "failed") {
    alert("Reload historical " + testType + ' test: failed!!');
  }
}

function genDropdownItem(dropdownDivId, inputIdTemp) {
  let dropdownDiv = document.getElementById(dropdownDivId);
  for (let i = 1; i < testNumDisplay; i ++ ) {
    let input = document.createElement("input");
    input.className = "dropdown-item";
    input.id = inputIdTemp + i;
    dropdownDiv.appendChild(input);
  }
}
