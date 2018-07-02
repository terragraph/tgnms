import { Dimensions, StyleSheet } from 'react-native';

module.exports = {
  styles: StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    bubbleTopLeft: {
      backgroundColor: "rgba(142, 142, 142, 0.8)",
      paddingHorizontal: 2,
      paddingVertical: 2,
      borderRadius: 5,
      //width: Dimensions.get('window').width - 60,
      marginLeft: 10,
      alignSelf: 'flex-start',
      top: 5,
      position: 'absolute',
    },
    bubbleTopRight: {
      paddingHorizontal: 2,
      paddingVertical: 2,
      borderRadius: 5,
      width: 45,
      right: 5,
      alignSelf: 'flex-end',
      top: 5,
      position: 'absolute',
    },
    bubbleBottom: {
      backgroundColor: "rgba(142, 142, 142, 0.8)",
      paddingHorizontal: 5,
      paddingVertical: 5,
      borderRadius: 10,
      //width: Dimensions.get('window').width - 20,
      alignSelf: 'center',
      marginTop: -10,
      flexDirection: 'column',
      justifyContent: 'flex-start',
    },
    bubbleText: {
      alignItems: 'stretch',
      flexDirection: 'row',
    },
    sectionHeader: {
      backgroundColor: 'rgba(50, 150, 255, 0.8)',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    sectionHeaderTitle: {
      fontWeight: 'bold',
      fontSize: 18,
      textAlign: 'center',
    },
    columns: {
      flexDirection: 'row',
      paddingVertical: 4,
    },
    headerRow: {
      backgroundColor: 'rgba(124, 124, 124, 0.8)',
    },
    rows: {
      paddingVertical: 2,
    },
    detailRows: {
      flexDirection: 'row',
    },
    backArrow: {
      position: 'absolute',
      left: 5,
    },
    closeBox: {
      position: 'absolute',
      right: 5,
    },
    cameraCloseBox: {
      //backgroundColor: 'rgb(124, 124, 124)',
      //marginTop: 50,
      //alignSelf: 'center',
      //height: 50,
      //width: Dimensions.get('window').width,
    },
    bigBox: {
      fontSize: 18,
    },
    zeroContainer: {
      height: 0,
      flex: 0,
    },
    cameraContainer: {
      //height: Dimensions.get('window').height,
      marginTop: 0,
    },
    linkText: {
      color: 'rgb(0, 0, 255)',
    },
  })
};
