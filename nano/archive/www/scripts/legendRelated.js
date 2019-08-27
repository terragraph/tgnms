function findNode(nodeName) {
  for (let i in nodes._layers) {
    if (nodes._layers[i].feature.id == nodeName) {
      return nodes._layers[i];
    }
  }
  return null;
}

function getColor(results){
  var colorsTemp = [];
  var idx = 0;
  results.eachLayer(function(layer) {
    var property = layer.feature.properties;
    var color = property.style.color;
    if (colorsTemp.indexOf(color) === -1) {
      colorsTemp.push(color);
    }
  });
  return colorsTemp;
}

function deriveLegend(testName) {
  console.log('derive legend for ' + testName);
  var colors = getColor(overlayMaps[testName]);
  var legendDescription = colorDefinition(colors, testName);
  if (testName == 'Link healthiness') {
    extendLegend(testName, legendDescription);
  } else {
    legendAdd(legendDescription, testName);
  }
}

function colorDefinition(colors, testName) {
  let legendDescription = [];
  if (testName === 'Link healthiness') {
    var colorBenchmark = ['#4CAF50', '#67C8FF', '#FFC107',
      '#F44336', '#212121', '#C0C0C0'];
    var descriptionBenchmark = ['Excellent', 'Healthy', 'Marginal',
      'Warning', 'No result', 'Test Failed'];
    for (let idx = 0; idx < colorBenchmark.length; idx ++) {
      if (colors.indexOf(colorBenchmark[idx]) !== -1) {
        let legendTemp = {
          "color" : colorBenchmark[idx],
          "description" : descriptionBenchmark[idx]
        };
        legendDescription.push(legendTemp);
      }
    }
  } else if (testName === 'Multihop') {
    var colorBenchmark = ['#4CAF50', '#67C8FF', '#FFC107', '#F44336'];
    var descriptionBenchmark = ['Excellent: <10% loss',
      'Healthy: 10%-25% loss', 'Marginal: 25%-50% loss', 'Warning: >50% loss'];
    for (let i = 0; i < colorBenchmark.length; i ++){
      let legendTemp = {
        "color" : colorBenchmark[i],
        "description" : descriptionBenchmark[i]
      };
      legendDescription.push(legendTemp);
    }
  } else if (testName === 'Ignition') {
    var colorBenchmark = ['#4CAF50', '#67C8FF', '#FFC107', '#F44336'];
    var descriptionBenchmark = ['Excellent: <2 link attempts',
      'Healthy: 2-5 link attempts', 'Marginal: 6-10 link attempts',
      'Warning: >10 link attempts or not ignited'];
    for (let i = 0; i < colorBenchmark.length; i ++){
      let legendTemp = {
        "color" : colorBenchmark[i],
        "description" : descriptionBenchmark[i]
      };
      legendDescription.push(legendTemp);
    }
  }
  return legendDescription;
}

//extend legend based on link healthiness summary
function extendLegend(test, legendDescription) {
  if (test == 'Link healthiness') {
    var linkHeathSummary = null;
    // load linkHealthSummaryudp.json via ajax
    $.ajax({
      url: "linkHealthSummaryudp.json",
      cache: false,
      dataType: "json",
      success: function (linkHealthData) {
        handleLoadlinkHealthSummary(linkHealthData, legendDescription);
      },
      error: function () {
          alert('ERROR in extendLegend.');
      },
    });
  } else {
  // TODO: for Multihop and Ignition test
  }
}

function handleLoadlinkHealthSummary(linkHealth, legendDescription) {
  var linkTemp = linkHealth.network_summary;
  for (let idx = 0; idx < legendDescription.length; idx ++) {
    if (legendDescription[idx].description == "Healthy") {
      var legendTemp = ": " + linkTemp.healthy + " links - " +
        ((linkTemp['healthy percentage']).toFixed(1)).bold() + "%";
      legendDescription[idx].description += legendTemp;
    } else if (legendDescription[idx].description == "Marginal") {
      var legendTemp = ": " + linkTemp.marginal + " links - " +
        ((linkTemp['marginal percentage']).toFixed(1)).bold() + "%";
      legendDescription[idx].description += legendTemp;
    } else if (legendDescription[idx].description == "Warning") {
      var legendTemp = ": " + linkTemp.warning + " links - " +
        ((linkTemp['warning percentage']).toFixed(1)).bold() + "%";
      legendDescription[idx].description += legendTemp;
    } else if (legendDescription[idx].description == "Excellent") {
      var legendTemp = ": " + linkTemp.excellent + " links - " +
        ((linkTemp['excellent percentage']).toFixed(1)).bold() + "%";
      legendDescription[idx].description += legendTemp;
    }
    legendAdd(legendDescription, 'Link healthiness');
  }
}
function legendAdd (legendDescription, testName) {
  let titleTemp = ""
  if (testName === "Multihop") {
    titleTemp = " - 800 mbps"
  }
  legend.onAdd = function (map) {
    let div = L.DomUtil.create('div', 'legend');
    L.DomEvent.disableClickPropagation(div);
    div.innerHTML = '<div><b>' + testName + titleTemp + ' ('
      + result_refresh_time + ')' + '</b></div>';
    for (let i = 0; i < legendDescription.length; i ++) {
      div.innerHTML += '<i style="background:' +
        legendDescription[i].color + '">&nbsp;&nbsp;</i>&nbsp;&nbsp;' +
        legendDescription[i].description + '<br>';
    }
    return div;
  };
  legend.addTo(mymap);
  if (showLegend === false) {
    $('.legend').hide();
  }
}

function toggleLegend() {
  if(showLegend === true) {
  /* use jquery to select your DOM elements that has the class 'legend'*/
     $('.legend').hide();
     showLegend = false;
  } else {
     $('.legend').show();
     showLegend = true;
  }
}
