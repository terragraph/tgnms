$(document).ready(function () {
  // load configuration from config.json file
  loadConfig('config.json', myMap)

  // handle to render geoJSON to the map
  $('#add_geojson_to_map').change(function(event) {
    // whenever user changed the content in input id=add_geojson_to_map
    // perform the following action
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

  // handel to parse topology (via backend api) and render output to the map
  $('#upload_topology').change(function(event) {
    // file handler
    var fd = new FormData();
    fd.append('file', event.target.files[0])
    // ajax call
    $.ajax({
      type: "POST",
      timeout: 50000,
      // api url
      url: (
        apiServerIP + ':' + apiServerPort +
        '/convert_topology_json_to_geojson'
      ),
      data: fd,
      cache: false,
      contentType: false,
      processData: false,
      success: function (data) {
        // check if returned data is valid
        if (data == null || $.isEmptyObject(data.site)) {
          alert('Failed to parse! Is uploaded file actually topology json?')
          return false;
        }
        // returned data shall have three parts: site, node, and link geoJSONs
        // load each and render on the map
        loadDataFromJson(data.site, event.target.files[0].name + ' Site', false)
        loadDataFromJson(data.node, event.target.files[0].name + ' Node', false)
        loadDataFromJson(data.link, event.target.files[0].name + ' Link', true)
        return false;
      },
      error: function (data, err) {
        console.log('err to upload data: ' + err);
      }
    });
  });
});
