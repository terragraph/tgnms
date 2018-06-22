module.exports = {
  offlineTopology() {
    return {
      name: 'Mikebuda',
      nodes: [
        {
          name: 'Central POP.p1',
          node_type: 2,
          is_primary: true,
          mac_addr: '2c:dc:ad:49:e2:cc',
          pop_node: true,
          polarity: 1,
          golay_idx: {
            txGolayIdx: 0,
            rxGolayIdx: 0
          },
          status: 1,
          secondary_mac_addrs: [],
          site_name: 'Central POP',
          ant_azimuth: 0,
          ant_elevation: 0,
          has_cpe: false
        },
        {
          name: '29T.p1',
          node_type: 2,
          is_primary: true,
          mac_addr: '2c:dc:ad:49:e0:fe',
          pop_node: true,
          polarity: 2,
          golay_idx: {
            txGolayIdx: 0,
            rxGolayIdx: 0
          },
          status: 1,
          secondary_mac_addrs: [],
          site_name: '29T POP',
          ant_azimuth: 0,
          ant_elevation: 0,
          has_cpe: false
        },
        {
          name: '40T.p1',
          node_type: 2,
          is_primary: true,
          mac_addr: '2c:dc:ad:49:e2:24',
          pop_node: true,
          polarity: 2,
          golay_idx: {
            txGolayIdx: 0,
            rxGolayIdx: 0
          },
          status: 1,
          secondary_mac_addrs: [],
          site_name: '40T POP',
          ant_azimuth: 0,
          ant_elevation: 0,
          has_cpe: false
        },
        {
          name: 'Central POP.p2',
          node_type: 2,
          is_primary: true,
          mac_addr: '2c:dc:ad:49:e2:b1',
          pop_node: true,
          polarity: 2,
          golay_idx: {
            txGolayIdx: 0,
            rxGolayIdx: 0
          },
          status: 1,
          secondary_mac_addrs: [],
          site_name: 'Central POP',
          ant_azimuth: 0,
          ant_elevation: 0,
          has_cpe: false
        },
        {
          name: '20_cn1',
          node_type: 1,
          is_primary: false,
          mac_addr: '',
          pop_node: false,
          polarity: 1,
          golay_idx: {
            txGolayIdx: 0,
            rxGolayIdx: 0
          },
          status: 1,
          secondary_mac_addrs: [],
          site_name: '20_cn1',
          ant_azimuth: 0,
          ant_elevation: 0,
          has_cpe: false
        },
        {
          name: '20_cn2',
          node_type: 1,
          is_primary: false,
          mac_addr: '',
          pop_node: false,
          polarity: 1,
          golay_idx: {
            txGolayIdx: 0,
            rxGolayIdx: 0
          },
          status: 1,
          secondary_mac_addrs: [],
          site_name: '20_cn2',
          ant_azimuth: 0,
          ant_elevation: 0,
          has_cpe: false
        },
        {
          name: '21.1',
          node_type: 2,
          is_primary: true,
          mac_addr: '',
          pop_node: false,
          polarity: 2,
          golay_idx: {
            txGolayIdx: 0,
            rxGolayIdx: 0
          },
          status: 1,
          secondary_mac_addrs: [],
          site_name: '21',
          ant_azimuth: 0,
          ant_elevation: 0,
          has_cpe: false
        },
        {
          name: '20.1',
          node_type: 2,
          is_primary: true,
          mac_addr: '',
          pop_node: false,
          polarity: 2,
          golay_idx: {
            txGolayIdx: 0,
            rxGolayIdx: 0
          },
          status: 1,
          secondary_mac_addrs: [],
          site_name: '20',
          ant_azimuth: 0,
          ant_elevation: 0,
          has_cpe: false
        },
        {
          name: '20.2',
          node_type: 2,
          is_primary: false,
          mac_addr: '',
          pop_node: false,
          polarity: 2,
          golay_idx: {
            txGolayIdx: 0,
            rxGolayIdx: 0
          },
          status: 1,
          secondary_mac_addrs: [],
          site_name: '20',
          ant_azimuth: 0,
          ant_elevation: 0,
          has_cpe: false
        },
        {
          name: '20.3',
          node_type: 2,
          is_primary: false,
          mac_addr: '',
          pop_node: false,
          polarity: 2,
          golay_idx: {
            txGolayIdx: 0,
            rxGolayIdx: 0
          },
          status: 1,
          secondary_mac_addrs: [],
          site_name: '20',
          ant_azimuth: 0,
          ant_elevation: 0,
          has_cpe: false
        }
      ],
      links: [
        {
          name: 'link-40T.p1-Central POP.p1',
          a_node_name: '40T.p1',
          z_node_name: 'Central POP.p1',
          link_type: 1,
          is_alive: false,
          linkup_attempts: 44,
          golay_idx: {
            txGolayIdx: 2,
            rxGolayIdx: 2
          },
          control_superframe: 0,
          a_node_mac: '2c:dc:ad:49:e2:24',
          z_node_mac: '2c:dc:ad:49:e2:cc'
        },
        {
          name: 'link-20.2-20_cn1',
          a_node_name: '20.2',
          z_node_name: '20_cn1',
          link_type: 1,
          is_alive: false,
          linkup_attempts: 0,
          golay_idx: {
            txGolayIdx: 2,
            rxGolayIdx: 2
          },
          a_node_mac: '',
          z_node_mac: ''
        },
        {
          name: 'link-20.3-20_cn2',
          a_node_name: '20.3',
          z_node_name: '20_cn2',
          link_type: 1,
          is_alive: false,
          linkup_attempts: 0,
          golay_idx: {
            txGolayIdx: 1,
            rxGolayIdx: 1
          },
          a_node_mac: '',
          z_node_mac: ''
        }
      ],
      sites: [
        {
          name: '4',
          location: {
            latitude: 47.159347,
            longitude: 19.6159931,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '23T',
          location: {
            latitude: 47.16121188609863,
            longitude: 19.61846614622035,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '1',
          location: {
            latitude: 47.15871756657402,
            longitude: 19.61710748208671,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '57',
          location: {
            latitude: 47.15765641145463,
            longitude: 19.61326546977579,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '16T',
          location: {
            latitude: 47.16160883436534,
            longitude: 19.61771711004213,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '27',
          location: {
            latitude: 47.16036840000001,
            longitude: 19.6195958,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '13',
          location: {
            latitude: 47.16051159999999,
            longitude: 19.616005,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '54',
          location: {
            latitude: 47.15853463318138,
            longitude: 19.61355064760492,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '33',
          location: {
            latitude: 47.15921060475164,
            longitude: 19.61790590503976,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '41',
          location: {
            latitude: 47.15749614871855,
            longitude: 19.61519497966262,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '15',
          location: {
            latitude: 47.16095940000001,
            longitude: 19.616624,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '25',
          location: {
            latitude: 47.1607588,
            longitude: 19.618948,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '47',
          location: {
            latitude: 47.15638070350148,
            longitude: 19.61494194504822,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '30',
          location: {
            latitude: 47.1598225,
            longitude: 19.6188178,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '7',
          location: {
            latitude: 47.15987677783772,
            longitude: 19.61512621024484,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '39',
          location: {
            latitude: 47.15780600000001,
            longitude: 19.61574,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '44',
          location: {
            latitude: 47.1568564,
            longitude: 19.6142671,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '21',
          location: {
            latitude: 47.161332,
            longitude: 19.617942,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '53',
          location: {
            latitude: 47.15824167991011,
            longitude: 19.61403189863511,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '40T POP',
          location: {
            latitude: 47.1579134,
            longitude: 19.6166584,
            altitude: 177.399,
            accuracy: 30.66396034435213
          }
        },
        {
          name: '29T POP',
          location: {
            latitude: 47.15998660390854,
            longitude: 19.61940908637789,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: 'Central POP',
          location: {
            latitude: 47.1580297,
            longitude: 19.616653,
            altitude: 173.377,
            accuracy: 37.52040085073719
          }
        },
        {
          name: '9',
          location: {
            latitude: 47.16019266406999,
            longitude: 19.61456447145314,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '20',
          location: {
            latitude: 47.16196,
            longitude: 19.6169,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '20_cn1',
          location: {
            latitude: 47.16255008482906,
            longitude: 19.615981578826908,
            altitude: 0,
            accuracy: 40000000
          }
        },
        {
          name: '20_cn2',
          location: {
            latitude: 47.16196650096917,
            longitude: 19.61719930171967,
            altitude: 0,
            accuracy: 40000000
          }
        }
      ],
      config: {
        channel: 2
      }
    };
  },
};
