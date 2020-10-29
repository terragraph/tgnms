// example using ajax to load data from file every 10s
function loadNewData() {
  // check current_test
  var file;
  var temp_layer;
  if (current_test === "Link healthiness") {
    file = "linkJsonDataudp.json";
    temp_layer = linksudp;
  }
  else if (current_test === "Multihop") {
    file = "nodeJsonDataMultihop.json";
    temp_layer = multihop;
  }
  else if (current_test === "Ignition") {
    file = "linkJsonDataIgnition.json";
    temp_layer = ignition;
  }
  console.log('in loadNewData, trying to load ' + file);
  var feedback = $.ajax({
    url: file,
    cache: false,
    dataType: "json",
    success: function (geojson) {
      if (mymap.hasLayer(temp_layer)) {
        temp_layer.clearLayers();
        temp_layer.addData(geojson);
        deriveLegend(current_test);
        result_status = "loaded";
        console.log(current_test + " results updates");
      } else {
        console.log(current_test + " results failed to update");
      }
    },
    error: function () {
      alert('ERROR in refresh data');
    },
  }).responseText;
}

function removeData() {
  var temp_layer;
  if (current_test === "Link healthiness") {
    temp_layer = linksudp;
  }
  else if (current_test === "Multihop") {
    temp_layer = multihop;
  }
  else if (current_test === "Ignition") {
    temp_layer = ignition;
  }
  if (mymap.hasLayer(temp_layer)){
    temp_layer.clearLayers();
    console.log(current_test + " layer cleared");
    result_status = "removed";
  }
  alert(current_test + " layer cleared!!");
}
