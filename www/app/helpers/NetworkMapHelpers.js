import Leaflet, { Point, LatLng } from 'leaflet';

export const getNodeMarker = (pos) => {
  const options = {
    data: {
      'dataPoint1': Math.random() * 20,
      'dataPoint2': Math.random() * 20,
      'dataPoint3': Math.random() * 20,
      'dataPoint4': Math.random() * 20
    },
    chartOptions: {
      'dataPoint1': {
        fillColor: '#FEE5D9',
        minValue: 0,
        maxValue: 20,
        maxHeight: 20,
        displayText: function (value) {
          return value.toFixed(2);
        }
      },
      'dataPoint2': {
        fillColor: '#FCAE91',
        minValue: 0,
        maxValue: 20,
        maxHeight: 20,
        displayText: function (value) {
          return value.toFixed(2);
        }
      },
      'dataPoint3': {
        fillColor: '#FB6A4A',
        minValue: 0,
        maxValue: 20,
        maxHeight: 20,
        displayText: function (value) {
          return value.toFixed(2);
        }
      },
      'dataPoint4': {
        fillColor: '#CB181D',
        minValue: 0,
        maxValue: 20,
        maxHeight: 20,
        displayText: function (value) {
          return value.toFixed(2);
        }
      }
    },
    weight: 1,
    color: '#000000',
    radius: 20,
  };

  return new Leaflet.PieChartMarker(
    new LatLng(pos[0], pos[1]),
    options
  );
}
