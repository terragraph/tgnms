/*
** parse hash upon change
**/
function hash_action(url_hash) {
  // sidebar related
  if (url_hash == "summary" || url_hash == "details" ||
    url_hash == "history" || url_hash == "tests" ||
    url_hash == "viewer" || url_hash == "about" ||
    url_hash == "search" || url_hash == "optimize") {
    if (url_hash == "search") {
      sidebar.open("details");
      $("#details_table_filter input").focus();
    } else {
      sidebar.open(url_hash);
    }
  }
  // node & link & site highlight
  if (url_hash.includes("node-") ||
      url_hash.includes("link-") ||
      url_hash.includes("site-")) {
    var id2find = url_hash;
    if (id2find.includes("node-")) id2find = id2find.replace("node-", "");
    if (id2find.includes("site-")) id2find = id2find.replace("site-", "");
    if (overlayMapOrder.length == 0) return;
    var foundit = false;
    // go through all visible layers to find the node
    for (var i in overlayMapOrder) {
      for (var feature in overlayMapOrder[i]["_layers"]) {
        if (overlayMapOrder[i]["_layers"][feature].id == id2find) {
          overlayMapOrder[i]["_layers"][feature].fireEvent('mouseclick');
          foundit = true;
          break;
        }
      }
    }
    if (!foundit) console.log("could not find " + id2find);
  }
}

/*
** display a progress bar
**/
function showProgress(updateDivId, progressInt, append = false) {
  if ($.type(updateDivId) === "string") updateDivId = $(updateDivId);
  if (append) {
    updateDivId.append(
      '<div class="progress">' +
      '<div class="progress-bar progress-bar-striped ' +
      'progress-bar-animated" style="width: ' +
      progressInt + '%"</div></div>'
    );
    return;
  }
  updateDivId.html(
    '<div class="progress">' +
    '<div class="progress-bar progress-bar-striped progress-bar-animated"' +
    ' style="width: ' + progressInt + '%"</div></div>'
  );
}

/*
** get tesh history geojson data based on collection name and test id
**/
function getTestHistory(geoJsonName, geoJsonTime, thisDiv) {
  thisDiv.prop("disabled", true);
  console.log('fetching history for ' + geoJsonName + ' @ ' + geoJsonTime);
  showProgress(thisDiv, 30, true);
  $.ajax({
    type: 'POST',
    url: apiServerIP + ':' + apiServerPort + '/get_data',
    dataType: 'json',
    data: JSON.stringify({"test": geoJsonName, "time": geoJsonTime}),
    async: true,
    success: function(response) {
      thisDiv.html(geoJsonTime);
      thisDiv.prop("disabled", false);
      if (response == null || response.features == null) {
        alert('Failed to get data!');
        return;
      }
      loadDataFromJson(
        response,
        response['test_type'].replace("geojson_", "") + " " +
        response['time'],
        true
      );
    },
    error: function () {
      thisDiv.html(geoJsonTime);
      thisDiv.prop("disabled", false);
      alert('ERROR in getTestHistory.');
    },
  });
}

/*
** get tesh history geojson data based on collection name and test id
**/
function downloadTestGeoJsonData(geoJsonName, geoJsonTime, thisDiv) {
  thisDiv.prop("disabled", true);
  console.log('fetching history for ' + geoJsonName + ' @ ' + geoJsonTime);
  $.ajax({
    type: 'POST',
    url: apiServerIP + ':' + apiServerPort + '/get_data',
    dataType: 'json',
    data: JSON.stringify({"test": geoJsonName, "time": geoJsonTime}),
    async: true,
    success: function(response) {
      thisDiv.html("GeoJson");
      thisDiv.prop("disabled", false);
      // Make the GeoJson files more human readable
      response = JSON.stringify(response, null, 2);
      var data = "text/json;charset=utf-8," + encodeURIComponent(response);
      // Download GeoJson data
      var analysis_geojson = document.createElement("a");
      analysis_geojson.href = "data:" + data;
      analysis_geojson.download = geoJsonName + "_" + geoJsonTime  +".json";
      analysis_geojson.innerHTML = "download GeoJson";
      analysis_geojson.click();
    },
    error: function () {
      thisDiv.html("GeoJson");
      thisDiv.prop("disabled", false);
      alert('ERROR in downloadTestGeoJSonData.');
    },
  });
}

/*
** get tesh history json data based on collection name and test id
**/
function downloadTestJsonData(geoJsonName, geoJsonTime, thisDiv) {
  thisDiv.prop("disabled", true);
  console.log('fetching history for ' + geoJsonName + ' @ ' + geoJsonTime);
  $.ajax({
    type: 'POST',
    url: apiServerIP + ':' + apiServerPort + '/get_data',
    dataType: 'json',
    data: JSON.stringify({"test": geoJsonName, "time": geoJsonTime}),
    async: true,
    success: function(response) {
      // Make the GeoJson files more human readable
      response = JSON.stringify(response, null, 2);
      var data = "text/json;charset=utf-8," + encodeURIComponent(response);
      // Download Json data
      var analysis_json = document.createElement("a");
      analysis_json.href = "data:" + data;
      analysis_json.download = geoJsonName + "_" + geoJsonTime +".json";
      analysis_json.innerHTML = "download Json";
      analysis_json.click();
      thisDiv.html("Json");
      thisDiv.prop("disabled", false);
    },
    error: function () {
      thisDiv.html("Json");
      thisDiv.prop("disabled", false);
      alert('ERROR in downloadTestJsonData.');
    },
  });
}

function deleteTestEntry(geojsonName, jsonName, geojsonTime) {
  if(confirm("Are you sure you want to delete these data?")) {
    $.ajax({
      type: 'POST',
      url: apiServerIP + ':' + apiServerPort + '/delete_analysis_data',
      dataType: 'json',
      data: JSON.stringify({"geojson_name": geojsonName, "json_name": jsonName,
                            "time": geojsonTime}),
      async: false,
      success: function() {
        alert("Test data deleted!");
        window.location.reload();
      },
      error: function () {
        alert("Failed to delete test data");
      },
    });
  }
}

/*
** when given the name of a geojson collection, return the name of the
** corresponding json collection
**/
function getCorrespondingJsonName(geoJsonName) {
  json_name = ""
  $.ajax({
    type: 'POST',
    url: apiServerIP + ':' + apiServerPort + '/get_json_name',
    dataType: 'json',
    data: JSON.stringify({"geojson_name": geoJsonName}),
    async: false,
    success: function(response) {
      json_name = response;
    },
    error: function () {
      alert("Error in getting corresponding Json collection name");
    },
  });
  return json_name;
}

/*
** get tesh history time based on collection name
** then write results to div recognized by id
**/
function getTestHistoryTime(geoJsonName, updateDivId, fetchJsonName = false) {
  if ($(updateDivId).is(':visible')) return;
  var thisQueryT = (new Date()).getTime() / 1000;
  if (thisQueryT - ($(updateDivId).attr('prev-query') || 1) < 300) {
    console.log('query too often (< 5min), will stop query');
    return;
  }
  console.log('fetching history: ' + geoJsonName);
  showProgress(updateDivId, 30);
  $.ajax({
    type: 'POST',
    url: apiServerIP + ':' + apiServerPort + '/get_history',
    dataType: 'json',
    data: JSON.stringify({"test": geoJsonName}),
    async: true,
    success: function(response) {
      $(updateDivId).html('');
      if (fetchJsonName === true) {
        json_name = getCorrespondingJsonName(geoJsonName);
      }
      for (i = 1; i <= queryLimit; i++) {
        var geoJsonTime = response['Test ' + i];
        if (response.hasOwnProperty('Test ' + i)) {
          // When it's a data history request for Overview, only GeoJson
          // download button needs to be displaced. Otherwise, both GeoJson and
          // Json download buttons should be displayed
          if (fetchJsonName === true) {
            $(updateDivId).append(
              // Create the button for displaying data
              "<div class='btn-group'>"  + "<button type='button'" +
              "onclick=\"getTestHistory($(this).attr('test-name')," +
              "$(this).attr('time_name'), $(this));\"" + "test-name='" +
              geoJsonName + "'" + "time_name='" + geoJsonTime +  "'" +
              "class='list-group-item list-group-item-action'>" + geoJsonTime +
              // Create the button for downloading Json files
              "</button>" + "&nbsp" +
              "<button type='button' " +
              "class='btn btn-outline-primary ' " +
              "onclick=\"downloadTestJsonData($(this).attr('test-name')," +
              " $(this).attr('time_name'), $(this));\"" +
              "test-name='" + json_name + "'" +
              "time_name='" + geoJsonTime + "'" + "class='btn-primary'>" +
              // Create the button for downloading GeoJson file
              "Json" + "</button>" + "<button type='button' " +
              "class='btn btn-outline-primary '" +
              "onclick=\"downloadTestGeoJsonData($(this).attr('test-name')," +
              " $(this).attr('time_name'), $(this));\"" + "test-name='" +
              geoJsonName + "'" + "time_name='" + geoJsonTime +
              // Create the button for deleting test entry
              "'" + "class='btn-primary'>" + "GeoJson" + "</button>" + "&nbsp" +
              "<button type='button' " + "class='btn btn-primary'" +
              "onclick=\"deleteTestEntry($(this).attr('test-name'), "+
              " $(this).attr('json_name')" + ", $(this).attr('time_name'), " +
              " $(this));\"" + "test-name='" + geoJsonName + "'" +
              "time_name='" + geoJsonTime + "' json_name='" + json_name + "'" +
              "'" + "class='btn-primary'>" + "<i class='fa fa-trash'></i>" +
              "</button>" + "</div>" + "<br>"
            );
          } else {
            $(updateDivId).append(
              // Create the button for displaying data
              "<div class='btn-group'>"  + "<button type='button'" +
              "onclick=\"getTestHistory($(this).attr('test-name')," +
              "$(this).attr('time_name'), $(this));\"" + "test-name='" +
              geoJsonName + "'" + "time_name='" + geoJsonTime + "'" +
              "class='list-group-item list-group-item-action'>" + geoJsonTime +
              "</button>" + "&nbsp" +
              // Create the button for downloading GeoJson file
              "<button type='button' " + "class='btn btn-outline-primary '" +
              "onclick=\"downloadTestGeoJsonData($(this).attr('test-name')," +
              " $(this).attr('time_name'), $(this));\"" + "test-name='" +
              geoJsonName + "'" + "time_name='" + geoJsonTime + "'" +
              "class='btn-primary'>" + "GeoJson" +
              "</button>" + "</div>" + "<br>"
            );
          }
        } else {
          if (i <= queryLimit) {
            $(updateDivId).append('No more geojson found.');
          }
          break;
        }
      }
      $(updateDivId).attr('prev-query', thisQueryT);
    },
    error: function () {
      $(updateDivId).html('');
      alert('ERROR in getTestHistoryTime.');
    },
  });
}

/*
** get data from `overview_labels` to generate
** table within Details tab
**/
function addDetailsTable() {
  if (apiServerIP == "" || apiServerIP == null) {
    // wait until config.json finishes loading
    setTimeout(function() {addDetailsTable();}, 50);
    return;
  }

  $.ajax({
    type: 'POST',
    url: apiServerIP + ':' + apiServerPort + '/get_data',
    dataType: 'text',
    data: JSON.stringify({"test": "overview_labels"}),
    async: true,
    success: function(response) {
      if (response == null) {
        alert('Failed to get data!');
        return;
      }
      mod_response = JSON.parse(response.replace(/NaN/g, "-1"));
      parseDataForTable(mod_response);
    },
    error: function (response) {
      console.error('ERROR in addDetailsTable');
    },
  });
}

/*
** Parse `overview_labels` response.
** Apply slightly different procedure for lb_*_uni and lb_* labels.
** Form table content with appropriate badges and tags.
** Show the table.
**/
function parseDataForTable(data) {
  var table_body = "";

  var test_labels_uni = [
    ["lb_link_condition", "lb_link_condition_uni"],
    ["lb_mcs", "lb_mcs_uni"],
    ["lb_interference", "lb_interference_uni"],
    ["lb_interference_net", "lb_interference_net_uni"],
    ["lb_ping_status", "lb_ping_status_uni"],
    ["lb_monitor_status", "lb_monitor_status_uni"],
    ["lb_alignment_status", "lb_alignment_status_uni"],
    ["lb_reciprocal_im", "lb_reciprocal_im_uni"]];

  var test_labels = [
    ["lb_tx_power", "lb_tx_power_status"],
    ["lb_foliage", "lb_foliage_status"]];

  for (var key in data) {
    if (! key.startsWith("link-")) {
      continue;
    }

    [nodeA, nodeZ] = key.split("link-")[1].split("-");
    direct_link_name = "<b>" + nodeA + "</b> &rarr; " + nodeZ;
    reverse_link_name = "<b>" + nodeZ + "</b> &rarr; " + nodeA;

    for ([link_name, direction] of
      [[direct_link_name, "a2z"], [reverse_link_name, "z2a"]]) {

      // for this badge we need to extract additional info.
      // process it aside of all other badges
      [health_badge, health_tag, health_sort_id] = get_badge_info_uni(
        key, data[key], direction, "lb_status", "lb_status_uni");

      var badges = [];

      // loop through all lb_*_uni lables
      for ([lb_elm, name] of test_labels_uni) {
        [badge, tag] = get_badge_info_uni(
          key, data[key], direction, lb_elm, name);

        // for most labels, we don't want `success=0` and `unknown=-1` badges.
        // In this case "badge == tag == <empty string>" and there is no need
        // to add an empty <span>.
        if (badge == tag && tag == "") {
          continue;
        }

        badges.push([badge, tag]);
      }

      // loop through non-lb_*_uni labels
      for ([lb_elm, name] of test_labels) {
        [badge, tag] = get_badge_info(key, data[key], lb_elm, name);

        if (badge == tag && tag == "") {
          continue;
        }

        badges.push([badge, tag]);
      }

      // add health badge to the pack
      badges.unshift([health_badge, health_tag]);

      // update the table with the link info
      table_body += add_new_row(key, health_sort_id, link_name, badges);
    }
  }

  //add all data to the table
  $("#details_table").find("tbody").append(table_body);

  //enable dataTable plugin
  $.fn.DataTable.ext.pager.numbers_length = 4;
  $("#details_table").DataTable({
    "destroy": true, //destroy previous instance of the dataTable if any
    "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "All"]],
    "columns": [{"width": "55%"}, null],
    "autoWidth": false
  });

  //the table is hidden by default
  $("#details_table").show();
}

/*
** assemble a new table row with corresponding badges and tags
**/
function add_new_row(link_name, health_sort_id, direction_link_name, badges) {
  var new_row = "" +
    "<tr data-name='" + link_name + "' onclick='addRowHandlers(this)'>" +
    "<td data-sort=" + link_name + ">" + direction_link_name +
    "</td><td data-sort=" + health_sort_id + ">";

  for ([badge, tag] of badges) {
    new_row += "<span class='badge " + badge + "'>" + tag + "</span> ";
  }

  new_row += "</td></tr>";
  return new_row
}

/*
** A table cell click handler. Shows the leaflet link popup.
** This function handles multiple/no layers situations.
**/
function addRowHandlers(elm) {
  var active_layer_idx = Object.keys(overlayMapOrder).length - 1;

  if (active_layer_idx == -1) {
    // no layers at all
    return
  }

  var active_layer = overlayMapOrder[active_layer_idx]["_layers"];

  for (var link in active_layer) {
    if (active_layer[link]["id"] == elm.attributes["data-name"].value) {
      active_layer[link].fireEvent('mouseclick');
      active_layer[link].fireEvent('mouseout');
      break;
    }
  }
}

/*
** handle key press event
**/
$(document).keydown(function(e) {
  if (e.keyCode === 114 || ((e.ctrlKey || e.metaKey) && e.which == 70)) {
    // ctrl + f (search)
    e.preventDefault();
    window.location.hash = "";
    window.location.hash = "#search";
  } else if (document.activeElement.nodeName == "INPUT") return;
  if (e.which == 27) {  // esc key
    sidebar.close();  // close sidebar
    window.location.hash = "";
  } else if (e.which == 73) {  // i(nfo)
    window.location.hash = "#about";  // about page
  } else if (e.which == 86) {  // v(iewer)
    window.location.hash = "#viewer";  // viewer page
  } else if (e.which == 68) {  // d(etails)
    window.location.hash = "#details";  // details page
  } else if (e.which == 83) {  // s(ummary)
    window.location.hash = "#summary";  // summary page
  } else if (e.which == 84) {  // t(ests)
    window.location.hash = "#tests";  // tests page
  } else if (e.which == 72) {  // h(istory)
    window.location.hash = "#history";  // history page
  }
});

/*
** check if test is running every 10 seconds
*/
var prev_running_status = "idle";
function checkTestStatus() {
  if (apiServerIP == "" || apiServerIP == null) {
    // wait until config.json finishes loading
    setTimeout(function() {checkTestStatus();}, 50);
    return;
  }
  $.ajax({
    type: 'GET',
    url: apiServerIP + ':' + apiServerPort + '/is_test_running',
    dataType: 'json',
    async: true,
    success: function(response) {
      if (response.status == "idle") {
        let words = "Nothing is running now. ";
        let finishedWords = (response.test_type == "" ||
          response.test_type == null) ? "" :
          ("Previous test " + response.test_type +
          " finished at " + response.end_time +
          " (started at " + response.start_time + ").");
        if (typeof updateTestRunningStatus === 'function') {
          updateTestRunningStatus(words + finishedWords);
        }
        if (prev_running_status != "idle") {
          // load latest map (force to load new layer here)
          get_initial_map_layer(true);
          // reload summary
          get_initial_overview();
          // alert the user that the test is finished
          alert(finishedWords);
        }
        prev_running_status = "idle";
      } else if (response.status == "running") {
        if (typeof updateTestRunningStatus === 'function') {
          updateTestRunningStatus(
            response.test_type + " is running since " +
            response.start_time + ".<br>" +
            "<button type='button' class='mt-3 btn btn-secondary'>" +
            "Suspend Test</button>"
          );
        }
        prev_running_status = "running";
      }
    },
    error: function () {},  // suppress the errors
  });
  setTimeout(function() {checkTestStatus();}, 10000); // update every 10s
}

/*
** initialize window actions: hash monitoring, copy to clipboard
**/
function initWindowActions() {
  // monitor hashtag change
  hash_action(window.location.hash.slice(1));
  $(window).on('hashchange', function() {
    hash_action(window.location.hash.slice(1));
  });
  // change hashtag if any link with href and hashtag is called
  $('a').click(function() {
    if ($(this).attr('href') != null && $(this).attr('href').includes('#')) {
      window.location.hash = $(this).attr('href');
    }
  });
  // if sidebar close action is triggered, also change hash
  $('.sidebar-close').click(function() {
    window.location.hash = ""
  });
  // copy to clipboard
  $('#details').on('mouseover', '.copy-to-clipboard', function() {
    $(this).attr({'position': 'relative'});
    let tmpcontent = $('<div></div>')
      .css({
        "position": "absolute",
        "z-index": 1,
        "top": -20,
        "left": 5,
        "width": "100px",
        "text-align": "center",
        "padding": "2px",
        "border-radius": "6px",
        "background-color": "black",
        "color": "white"
      }).text('click to copy').addClass("tempcontent");
    $(this).append(tmpcontent)
  }).on('mouseout', '.copy-to-clipboard', function() {
    $(this).children('.tempcontent').remove();
  }).on('click', '.copy-to-clipboard', function() {
    $(this).children('.tempcontent').html('');
    let tmp = $("<input>");
    $("body").append(tmp);  // hidden content
    tmp.val($(this).text()).select();
    document.execCommand("copy");  // copy
    tmp.remove();
    $(this).children('.tempcontent').html('copied');
  });
  // dynamically load panel history from html file
  $.ajax({
    url: 'defaults/panelHistory.html',
    success: function(c) {
      $('#history-content').html(c);
      translator = new Translater({tag: "script"});
    },
    error: function () {},
  });
  // dynamically load panel test from html file
  $.ajax({
    url: 'defaults/panelTest.html',
    success: function(c) {
      $('#tests-content').html(c);
      translator = new Translater({tag: "script"});
    },
    error: function () {},
  });
  // dynamically load panel optimize from html file
  $.ajax({
    url: 'defaults/panelOptimize.html',
    success: function(c) {
      $('#optimize-content').html(c);
      translator = new Translater({tag: "script"});
    },
    error: function () {},
  });
  // load summary greetings page
  $.ajax({
    url: 'defaults/greetings.html',
    success: function(response) {
      $("#greetings").attr('style', '').html(response)
      .on('click', '.dismiss', function() {
        $("#greetings").fadeOut();
      });
      translator = new Translater({tag: "script"});
    },
    // suppress the errors
    error: function () { console.log("cannot load greetings"); },
  });
  // load about page
  $.ajax({
    url: 'defaults/network_analyzer_intro.html',
    success: function(response) {
      $("#about-html").html(response);
      translator = new Translater({tag: "script"});
    },
    // suppress the errors
    error: function () { console.log("cannot load intro"); },
  });
  // add hook page before/after details
  $.ajax({
    url: 'defaults/hookDetailsContainerBefore.html',
    success: function(v) {hookDetailsContainerBefore = v;},
    error: function () {},
  });
}


/*
** validate if local storage should expire, and expire it
** 86400000 is a day in ms
**/
function validateLocalStorage() {
  var now = new Date().getTime();
  var configTime = localStorage.getItem('NAconfigTime');
  if (configTime == null) {
    localStorage.setItem('NAconfigTime', now)
  } else {
      if(now - configTime > localStorageExpireDays * 86400000) {
          localStorage.clear()
          localStorage.setItem('NAconfigTime', now);
      }
  }
}

/*
** initialize topology viewer actions
**/
function initTopologyView() {
  // handle to render geoJSON to the map
  $('#add_geojson_to_map').change(function(event) {
    // whenever user changed the content in input id=add_geojson_to_map
    // perform the following action
    // 0. check if is empty
    if (event.target.files[0] == null) return;
    // 1. read file locally
    var reader = new FileReader();
    reader.onload = function(e) {  // act only when loaded (readAsText)
      try {
        // 2. parse it into json format
        var jsonObj = JSON.parse(e.target.result);
        // 3. render geoJSON onto the map
        loadDataFromJson(jsonObj, event.target.files[0].name, true);
      } catch (err) {
        alert('err to load geojson data you uploaded: ' + err);
      }
    }
    reader.readAsText(event.target.files[0]);
  });

  // handle to parse topology (via backend api) and render output to the map
  $('#upload-topology-file input').change(function(event) {
    if (event.target.files[0] == null) textUpdate = '';
    else textUpdate = event.target.files[0].name;
    $('#upload-topology-file label').text(textUpdate);
  });
  $('#upload-topology,#upload-topology-predict').click(function() {
    var topologyFile = $('#upload-topology-file input')[0].files[0];
    if (topologyFile == null || topologyFile.name == '') {
      return;
    }
    console.log('upload topology for converting..');
    var ele = $(this).parents('.container');
    showProgress(ele, 30, true);
    // file handler
    var fd = new FormData();
    fd.append('file', topologyFile);
    // prediction
    var extraString = this.id.includes('predict') ? ' w/ prediction': '';
    fd.append('predict', extraString);
    // ajax call
    $.ajax({
      type: "POST",
      // api url
      url: (
        apiServerIP + ':' + apiServerPort +
        '/convert_topology_json_to_geojson'
      ),
      data: fd,
      timeout: 60000,
      async: true,
      cache: false,
      contentType: false,
      processData: false,
      success: function (data) {
        ele.children('.progress').remove();
        // check if returned data is valid
        if (data == null || $.isEmptyObject(data.site)) {
          alert('Failed to parse! Is file actually topology json?');
          return false;
        }
        // returned data shall have three parts: site, node, and link
        // geoJSONs load each and render on the map
        loadDataFromJson(
          data.site, topologyFile.name + ' Site' + extraString, false)
        loadDataFromJson(
          data.node, topologyFile.name + ' Node' + extraString, false)
        loadDataFromJson(
          data.link, topologyFile.name + ' Link' + extraString, true)
        return false;
      },
      error: function (data, err) {
        ele.children('.progress').remove();
        console.log('err to upload data: ' + err);
      }
    });
  });
}


function translate_keys_to_words(name, keys) {
  mylabels = [];
  for (let i = 0; i < keys.length; i++) {
    mylabels.push(translate_key_to_word(name, keys[i]));
  }
  return mylabels;
}


function translate_key_to_color_opacity(name, key, opacity=1) {
  color = translate_key_to_color(name, key);
  if (opacity == 1 || opacity == 100) return color;
  hex = color.replace('#','');
  r = parseInt(hex.substring(0, 2), 16);
  g = parseInt(hex.substring(2, 4), 16);
  b = parseInt(hex.substring(4, 6), 16);
  if (opacity > 1) opacity = opacity / 100.0;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
}

function translate_keys_to_colors(name, keys, opacity=1) {
  myColors = [];
  for (let i = 0; i < keys.length; i++) {
    myColors.push(translate_key_to_color_opacity(name, keys[i], opacity));
  }
  return myColors;
}


function add_hist_to_elm(name, snapshot, daysum, elmId, xlabel = "") {
  var data_s = snapshot[name];  // data in a snapshot
  var data_l = daysum[name];  // data over days
  if (data_s == null || data_l == null ||
      data_s.details_num == null || data_l.details_num == null) return;
  // sync data to prevent inconsistent keys issue
  tmpkeys = Object.keys(data_s.details_num);
  for (let i in tmpkeys) {
    if (data_l.details_num[tmpkeys[i]] == null) {
      data_l.details_num[tmpkeys[i]] = 0;
    }
  }
  tmpkeys = Object.keys(data_l.details_num);
  for (let i in tmpkeys) {
    if (data_s.details_num[tmpkeys[i]] == null) {
      data_s.details_num[tmpkeys[i]] = 0;
    }
  }
  var keys = Object.keys(data_s.details_num);
  var datasets = [];
  // prepare dataset
  datasets.push({
    label: 'snapshot',
    data: Object.values(data_s.details_num),
    backgroundColor: translate_keys_to_colors(name, keys, 0.6),
    fillOpacity: 0.5,
    borderWidth: 1
  });
  datasets.push({
    label: '30day',
    data: Object.values(data_l.details_num),
    backgroundColor: translate_keys_to_colors(name, keys),
    borderWidth: 1
  });
  var obj = $('<canvas>', { id: elmId + "-" + name});
  var newchart = new Chart(obj, {
      type: 'bar',
      data: {
          labels: translate_keys_to_words(name, keys),
          datasets: datasets
      },
      options: {
          scales: {
            xAxes: [{
              ticks: {beginAtZero: true},
              scaleLabel: { display: true, labelString: xlabel }
            }],
            yAxes: [{ scaleLabel: { display: true, labelString: "counts" }}]
          }
      }
  });
  $("#" + elmId).append(obj);
}


/*
** get the initial overview
**/
function get_initial_overview() {
  if (apiServerIP == "" || apiServerIP == null) {
    // wait until config.json finishes loading
    setTimeout(function() {get_initial_overview();}, 50);
    return;
  }
  var snapshot, daysummary;
  $.when(
    $.ajax({
      type: 'POST',
      url: apiServerIP + ':' + apiServerPort + '/get_data',
      dataType: 'json',
      data: JSON.stringify({"test": "overview_histograms"}),
      async: true,
      success: function(response) {
        snapshot = response;
      },
      error: function () {
        console.error('ERROR in overview_histograms.');
      },
    }),
    $.ajax({
      type: 'POST',
      url: apiServerIP + ':' + apiServerPort + '/get_data',
      dataType: 'json',
      data: JSON.stringify({"test": "overview_histograms_sum_days_30"}),
      async: true,
      success: function(response) {
        daysummary = response;
      },
      error: function () {
        console.error('ERROR in overview_histograms_sum_days_30.');
      }
    })
  ).then(function () {
    $("#overview-histo").html('');
    $("#linkview-histo").html('');
    $("#nodeview-histo").html('');
    console.log("Got initial overview histogram response");
    // overview
    add_hist_to_elm(
      "lb_udp_status_uni", snapshot, daysummary,
      "overview-histo", "link healthiness");
    // linkview
    add_hist_to_elm(
      "mcs_uni", snapshot, daysummary, "linkview-histo", "MCS P90");
    add_hist_to_elm(
      "txPowerIndex_uni", snapshot, daysummary,
      "linkview-histo", "txPowerIndex");
    add_hist_to_elm(
      "perE6_uni", snapshot, daysummary,
      "linkview-histo", "Averaged PER (%)");
    add_hist_to_elm(
      "lb_link_condition_uni", snapshot, daysummary,
      "linkview-histo", "BA & data loss");
    add_hist_to_elm(
      "distance", snapshot, daysummary, "linkview-histo", "distance (m)");
    // nodeview
    add_hist_to_elm(
      "lb_alignment_status_uni", snapshot, daysummary,
      "nodeview-histo", "box misalignment");
  });
}


/*
** get the initial map layer
** TODO: use geojson_summary instead of geojson_iperf_p2p_udp
**/
function get_initial_map_layer(forceit) {
  if (apiServerIP == "" || apiServerIP == null) {
    // wait until config.json finishes loading
    setTimeout(function() {get_initial_map_layer(forceit);}, 50);
    return;
  }
  var userResponse;
  if (!forceit) {
    // load if user already has something stored
    if (localStorage.getItem("NAsummaryLayer") != null) {
      console.log("User has initial map layer response; load it first");
      try {
        userResponse = JSON.parse(localStorage.getItem("NAsummaryLayer"));
        loadDataFromJson(
          userResponse,
          userResponse['test_type'].replace("geojson_", ""),
          true
        );
      } catch (err) {
        console.log("Error parse NAsummaryLayer in user local storage: " + err);
      }
    }
  }
  // check on the fly what is the latest result
  $.ajax({
    type: 'POST',
    url: apiServerIP + ':' + apiServerPort + '/get_data',
    dataType: 'json',
    data: JSON.stringify({"test": "geojson_overview_labels"}),
    async: true,
    success: function(response) {
      console.log("Got initial map layer response");
      // if it is the same, then do not do anything
      // if we force it, skip the check
      if (
        !forceit &&
        userResponse != null &&
        userResponse.time == response.time
      ) {
        console.log("It is the same as users, no need to draw again :)");
        return;
      }
      // load the new map (since name is the same,
      // it will automatically remove the old one)
      console.log("Initial map layer response differed from users; update it");
      loadDataFromJson(
        response, response['test_type'].replace("geojson_", ""), true);
      localStorage.setItem("NAsummaryLayer", JSON.stringify(response));
    },
    error: function () {
      console.log('ERROR in get_initial_map_layer.');
    },
  });
}

$(document).ready(function () {
  // load configuration from config.json file
  loadConfig('config.json', myMap);

  // add sidebar to map
  sidebar = L.control.sidebar('sidebar', {position: "right"}).addTo(myMap);

  // initialize window hash monitoring
  initWindowActions();

  // initialize topology viewer action
  initTopologyView();

  /*
  ** the following needs to wait until config.json loaded
  ** in each function we check every 50ms
  **/

  // check and expire localStorage if necessary
  validateLocalStorage();

  // get overview
  get_initial_overview();

  // initialize to periodically check test running status
  checkTestStatus();

  // load initial map layers from database (do not force to load new layer)
  get_initial_map_layer(false);

  // add link healthiness table to Details tab
  addDetailsTable();
});

function translate_key_to_color(name, key) {
  if (
    ["lb_udp_status_uni", "lb_tcp_status_uni", "lb_status_uni"].includes(name)){
    switch (key) {
      case "0": return "#4CAF50";
      case "1": return "#67C8FF";
      case "2": return "#FFC107";
      case "3": return "#F44336";
      default: return "#90A4AE"
    }
  }
  return "#90A4AE";
}

/*
** convert test labels into strings
**/
function translate_key_to_word(name, key) {
  if (name == "lb_foliage_status") {
    switch (key) {
      case "-1": return "missing data";
      case "0": return "no foliage";
      case "1": return "maybe foliage";
      case "2": return "foliage";
      default: return "unknown"
    }
  } else if (
    ["lb_udp_status_uni", "lb_tcp_status_uni", "lb_status_uni"].includes(name)){
    switch (key) {
      case "0": return "excellent";
      case "1": return "healthy";
      case "2": return "marginal";
      case "3": return "warning";
      default: return "unknown"
    }
  } else if (name == "lb_link_condition_uni") {
    switch (key) {
      case "0": return "no loss";
      case "1": return "BA loss";
      case "2": return "BA & data loss";
      case "3": return "both";
      default: return "unknown"
    }
  } else if (name == "lb_alignment_status_uni") {
    switch (key) {
      case "0": return "aligned";
      case "1": return "tx/rxIdx diff";
      case "2": return "large deg";
      case "3": return "large diff & deg";
      case "4": return "swapped";
      default: return "unknown"
    }
  } else if (name == "lb_mcs_uni") {
    switch (key) {
      case "0": return "mcs match";
      case "1": return "mcs maybe low";
      case "2": return "mcs mismatch";
      case "3": return "mcs low & mismatch";
      case "4": return "mcs low";
      case "6": return "mcs low & mismatch";
      default: return "unknown"
    }
  } else if (name == "lb_interference_uni") {
    switch (key) {
      case "0": return "no interf (im)";
      case "1": return "weak interf (im)";
      case "2": return "strong interf (im)";
      case "3": return "interf (im)";
      default: return "unknown"
    }
  } else if (name == "lb_interference_net_uni") {
    switch (key) {
      case "0": return "no interf (net)";
      case "1": return "weak interf (net)";
      case "2": return "strong interf (net)";
      case "3": return "interf (net)";
      default: return "unknown"
    }
  } else if (name == "lb_ping_status_uni") {
    switch (key) {
      case "0": return "latency <10";
      case "1": return "latency <50";
      case "2": return "latency <100";
      case "3": return "latency <150";
      case "4": return "latency >150";
      default: return "unknown"
    }
  } else if (name == "lb_monitor_status_uni") {
    switch (key) {
      case "0": return "mcs excellent";
      case "1": return "mcs okay";
      case "2": return "mcs marginal";
      case "3": return "mcs warning";
      case "4": return "mcs=0";
      default: return "unknown"
    }
  } else if (name == "lb_tx_power_status") {
    switch (key) {
      case "0": return "power match";
      case "1": return "power mismatch A";
      case "2": return "power mismatch Z";
      case "3": return "power mismatch";
      default: return "unknown"
    }
  }
  return key;
}

/*
** convert test labels into badges
**/
function translate_key_to_badge(name, key) {
  if (name == "lb_foliage_status") {
    switch (key) {
      case "1": return "badge-warning";
      case "2": return "badge-danger";
      default: return "badge-light"
    }
  } else {
    switch (key) {
      case "0": return "badge-success";
      case "1": return "badge-primary";
      case "2": return "badge-warning";
      case "3": return "badge-danger";
      case "4": return "badge-danger";
      default: return "badge-secondary"
    }
  }
}

/*
** Hangle non-lb_*_uni test labels.
** This function is a wrapper around lb_*_uni case.
**/
function get_badge_info(link_name, data, lb_elm, name) {
  return get_badge_info_uni(link_name, data, "", lb_elm, name)
}

/*
** handle lb_*_ini test labels.
**/
function get_badge_info_uni(link_name, data, direction, lb_elm, name) {
  var suffix = "";

  if (direction) {
    // need to accommodate `status` badge for UDP and TCP results
    if (name == "lb_status_uni") {
      for ([lb_elm, suffix] of
        [["lb_udp_status", " (udp)"], ["lb_tcp_status", " (tcp)"]]) {

        if (lb_elm in data) {
          raw_value = data[direction][lb_elm];
          break;
        }
      }
    } else {
      raw_value = data[direction][lb_elm];
    }
  } else {
    raw_value = data[lb_elm];
    if (name == "lb_foliage_status") {
      suffix = " <i class='fa fa-tree'></i>";
    }
  }

  // do nothing if `lb_*` element is absent
  if (raw_value === undefined) {
      console.debug("link name: '" + link_name + "' " + lb_elm + ": undefined");
      return ["", ""]
  }

  // we want `success=0` and `unknown=-1` badges for
  // lb_udp_status and lb_tcp_status only
  if (name != "lb_status_uni") {
    if (raw_value <= 0) {
      return ["", ""]
    }
  }

  value = raw_value.toString();
  tag = translate_key_to_word(name, value) + suffix;
  badge = translate_key_to_badge(name, value);

  if (name == "lb_status_uni") {
    return [badge, tag, value]
  } else {
    return [badge, tag]
  }
}
