#!/usr/bin/env python3

# keys in use in current official topology file
IS_PRIMARY = "is_primary"
MAC_ADDRESS = "mac_addr"
IS_POP = "pop_node"
SITENAME = "site_name"
NODE_TYPE = "node_type"
GOLAY_IDX = "golay_idx"
GOLAY_IDX_TX = "txGolayIdx"
GOLAY_IDX_RX = "rxGolayIdx"
POLARITY = "polarity"
IS_LINK_ALIVE = "is_alive"
LINK_A_NODE = "a_node_name"
LINK_A_MAC = "a_node_mac"
LINK_Z_NODE = "z_node_name"
LINK_Z_MAC = "z_node_mac"
LINK_TYPE = "link_type"
LINK_ATTEMPTS = "attempts"
LINKUP_ATTEMPTS = "linkup_attempts"
SITE_LOCATION = "location"
DISTANCE = "distance"
DASHBOARD = "dashboard"

# alignment
MISALIGN_THRESH_DEG = 30  # w.r.t. boresight (positive always)
TX_RX_DIFF_THRESH_DEG = 6

# keys for topology enhancement
STATUS = "status"
OUTBAND_IP = "outband_ip"
INBAND_IP = "inband_ip"
LINK_NAME = "link_name"
LINKED_NODE = "linked_node"
BEAM_INFO = "current_beam_info"

# keys for phy info
BEAM_TX = "txIdx"
BEAM_RX = "rxIdx"
BEAM_TX_ANG = "txAng"
BEAM_RX_ANG = "rxAng"
TX_POWER = "txPower"
TX_POWER_IDX = "txPwrIdx"
RSSI = "rssi"
SNR = "snrEst"
POSTSNR = "postSNRdB"
IF_GAIN = "IFgain"
RF_GAIN = "RFgain"
RAW_RSSI = "rawRSSI"
TX_FAIL = "diffTxFail"
TX_OK = "diffTxOk"
RX_FAIL = "diffRxFail"
RX_OK = "diffRxOk"
RX_PLCP_FIL = "rxPlcpFil"
PER = "perE6"
MCS = "MCS"
DATA = "(Data)"
MGMT = "(mgmt)"
REL_IM_BEAMS = "relImBeams"

# keys for multi-hop test/analysis configuration
NORTHBOUND = "northbound"
SOUTHBOUND = "southbound"
BIDIRECTION = "bidirection"
CN_ONLY = "cn_only"
DN_SITE = "dn_site"

# keys for scan reports
SCAN_TYPE_INVALID = 0
SCAN_TYPE_PBF = 1
SCAN_TYPE_IM = 2
SCAN_TYPE_RTCAL = 3
SCAN_TYPE_CBF_TX = 4
SCAN_TYPE_CBF_RX = 5

SCAN_MODE_INVALID = 0
SCAN_MODE_COARSE = 1
SCAN_MODE_FINE = 2
SCAN_MODE_SELECTIVE = 3
SCAN_MODE_RELATIVE = 4

# Firmware log level to use for all modules
DEBUG = 0
INFO = 1
ERROR = 2
FATAL = 3

# key for site location accuracy threshold
LOCATION_ACCURACY_THRESHOLD = 20
# traceroute operation every 12 seconds
TRACEROUTE_INTERVAL = 12
PING_INTERVAL = 1

# misc keys
A2Z_BEST = "a2z_best_path"
Z2A_BEST = "z2a_best_path"
A2Z = "a2z"
Z2A = "z2a"
TCP = "tcp"
UDP = "udp"
MONITOR = "monitor"
PATHLOSS = "pathloss"
CONNECTIVITY = "connectivity"
SW_VERSION = "version"

############################
# Tests Label Names
############################
LB_LINK_IMPORTANCE = "lb_link_importance"
LB_MCS = "lb_mcs"
LB_LINK = "lb_link_condition"
LB_POWER = "lb_tx_power"
LB_FOLIAGE = "lb_foliage"
LB_INTERF = "lb_interference"
LB_INTERF_NET = "lb_interference_net"
LB_PING_STATUS = "lb_ping_status"
LB_UDP_STATUS = "lb_udp_status"
LB_TCP_STATUS = "lb_tcp_status"
LB_MON_STATUS = "lb_monitor_status"
LB_MISALIGNMENT = "lb_alignment_status"
# 0x00 means no probleml; 0x01 = STATUS_LARGE_ANGLE;
# 0x10 = STATUS_TX_RX_DIFF; 0x11 both
LB_RECIPROCAL_IM = "lb_reciprocal_im"

ALL_LBS = [
    LB_MCS,
    LB_LINK,
    LB_POWER,
    LB_FOLIAGE,
    LB_INTERF,
    LB_INTERF_NET,
    LB_PING_STATUS,
    LB_UDP_STATUS,
    LB_TCP_STATUS,
    LB_MON_STATUS,
    LB_MISALIGNMENT,
    LB_RECIPROCAL_IM,
]

############################
# Label Values
############################

## Link type
WIRELESS_LINK = 1
WIRED_LINK = 2

## Link/node/route importance
STATUS_IMPORTANCE_TIER_1 = 3
STATUS_IMPORTANCE_TIER_2 = 2
STATUS_IMPORTANCE_TIER_3 = 1
STATUS_IMPORTANCE_TIER_4 = 0

## General purpose
STATUS_UNKNOWN = -1
STATUS_MATCH = STATUS_OK = 0
STATUS_MISMATCH = 1

## link health (iperf, ping) related
# status in format of `az` - `a` is A -> Z, `z` is Z -> A
STATUS_BAD_CONSTANT = 4  # 4 is bad constantly (way above avg)
STATUS_BAD_OCCASION = 3  # 3 is bad occasionally (way above avg)
STATUS_WARNING = 2  # 2 is warning (above avg)
STATUS_HEALTHY = 1  # 1 is okay
STATUS_EXCELLENT = 0  # 0 is okay
STATUS_VALUE = [
    STATUS_BAD_CONSTANT,
    STATUS_BAD_OCCASION,
    STATUS_WARNING,
    STATUS_HEALTHY,
    STATUS_EXCELLENT,
    STATUS_UNKNOWN,
]

## box alignment related
STATUS_TX_RX_HEALTHY = 0
STATUS_TX_RX_DIFF = 1  # node: sector has quite different tx/rx beams
STATUS_LARGE_ANGLE = 2  # node: beam steering angle is large
STATUS_BOX_SWAPPED = 4  # node

## foliage related
STATUS_NON_FOLIAGE = 0
STATUS_FOLIAGE_LIKELY = 1
STATUS_FOLIAGE = 2

## MCS related (use one-pad 0b000)
STATUS_MCS_MATCH = STATUS_MCS_OK = STATUS_MATCH
STATUS_MCS_LOW_OCCASION = 1
STATUS_MCS_MISMATCH = 2
STATUS_MCS_LOW = 4

##
STATUS_POWER_MATCH = STATUS_MATCH
STATUS_POWER_MISMATCH = 3
STATUS_POWER_MISMATCH_A = 1
STATUS_POWER_MISMATCH_Z = 2

## interference related
STATUS_NO_INTERF = 0
STATUS_WEAK_INTERF = 1
STATUS_STRONG_INTERF = 2
STATUS_INTERF_A = 1  # deprecated
STATUS_INTERF_Z = 2  # deprecated
STATUS_INTERF = 3

STATUS_DATA_BA_LOSS = 3
STATUS_DATA_LOSS = 2
STATUS_BA_LOSS = 1
STATUS_NO_LOSS = 0

## p2mp test traffic direction
BIDIRECTIONAL = 1
DN_TO_PEER = 2
PEER_TO_DN = 3

# keys for health check
LINK_ROUTE_NUM = "link_route_num"  # the number of routing paths a link support
MULTIHOP_ROUTE = "multihop_route"  # routing paths a link support
PER_HOP_LATENCY = "per_hop_latency"
HOP_COUNT = "hop_count"
WIRELESS_HOP_COUNT = "wireless_hop_count"
WIRELESS_PATH = "wireless_path"
WIRELESS_PATH_NUM = "wireless_path_num"
DOMINANT_WIRELESS_PATH = "dominant_wireless_path"
DOMINANT_WIRELESS_PATH_OCCURRENCE = "dominant_wireless_path_occurrence"
NODES_PATH = "nodes_path"
START_TIME = "start_time"
TRACEROUTE_DETAILS = "traceroute_details"
NUM_VALID_ROUTE_PATHS = "num_valid_route_paths"
TRACEROUTE_INFO = "traceroute_info"
TRACEROUTE_IPS = "traceroute_ipv6s"
TRACEROUTE_HOP = "traceroute_hop"
PING_P90 = "ping_p90"
PING_MIN = "ping_min"
PING_MAX = "ping_max"
PING_AVG = "ping_avg"
PING_STD = "ping_std"
PING_LOSS = "ping_loss"
PING_DETAILS = "ping_details"
PING_PKT_TRANS = "ping_pkt_tx"
PING_PKT_RECV = "ping_pkt_rx"
PING_DURATION = "ping_duration_ms"
MCS_AVG = "mcs_avg"
MCS_STD = "mcs_std"
MCS_MAX = "mcs_max"
MCS_MIN = "mcs_min"
MCS_P90 = "mcs_p90"
IPERF_MIN = "iperf_min"
IPERF_MAX = "iperf_max"
IPERF_AVG = "iperf_avg"
IPERF_STD = "iperf_std"
IPERF_START = "iperf_start"
IPERF_END = "iperf_end"
IPERF_PER_AVG = "iperf_PER_avg"
IPERF_UDP_LOSS = "iperf_udp_loss"
IPERF_TCP_RETRANS = "iperf_tcp_retrans"
IPERF_DETAILS = "iperf_details"
TARGET_BITRATE = "target_bitrate"
DOF = "degrees_of_freedom"
# keys for interference
USE_MAX_PWR = "use_max_pwr"
USE_CUR_PWR = "use_cur_pwr_est"
USE_CUSTOMIZED_PWR = "use_customized_pwr_est"
INTERFERS = "interferers"

############################
# ODS/R2D2 Key Names
############################

# there are still many more.. will add more later
ODS_QUERY_ENTITY = "entity"
ODS_QUERY_KEY = "key"
ODS_QUERY_DATA = "data"
# begin === TG FW Stats
# begin === ODS_PHY_DATA_PRE or ODS_PHY_PRE as prefix
ODS_PHY_DATA_PRE = "phystatusdata"
ODS_PHY_PRE = "phystatus"
ODS_IF_GAIN = "gainIndexIf"
ODS_IF_MAXGAIN = "maxGainIndexIf"
ODS_RF_GAIN = "gainIndexRf"
ODS_RF_MAXGAIN = "maxGainIndexRf"
ODS_LDPC = "ldpcIterations"
ODS_NUM_CODEWORDS = "numTotalCodewords"
ODS_NUM_SYNDROMES = "numTotalSyndromes"
ODS_PLCP_LEN = "plcpLength"
ODS_RAW_RSSI = "rawAdcRssi"  # should be about the same, around -14 +-6
ODS_RX_MCS = "rxMcs"
ODS_RX_STARTNORMALIZED = "rxStartNormalized"
ODS_POSTSNR = "s" + POSTSNR
ODS_RSSI = "s" + RSSI
ODS_SNR = "s" + SNR
ODS_TSF = "tsf"
OSD_DBG16 = "dbg16"
# end === ODS_PHY_DATA_PRE or ODS_PHY_PRE as prefix
ODS_PHY = [
    "{0}.{1}".format(ODS_PHY_PRE, x)
    for x in [
        ODS_SNR,
        ODS_RSSI,
        ODS_POSTSNR,
        ODS_RX_MCS,
        ODS_RAW_RSSI,
        ODS_RF_GAIN,
        ODS_IF_GAIN,
        ODS_TSF,
        OSD_DBG16,
    ]
]
ODS_PHY_DATA = [
    "{0}.{1}".format(ODS_PHY_DATA_PRE, x)
    for x in [
        ODS_SNR,
        ODS_RSSI,
        ODS_POSTSNR,
        ODS_RX_MCS,
        ODS_RAW_RSSI,
        ODS_RF_GAIN,
        ODS_IF_GAIN,
        ODS_TSF,
        OSD_DBG16,
    ]
]
ODS_PERIOD_LQM = "phyPeriodic.pktLqm"
ODS_PERIOD_RSSI = "phyPeriodic.pktRssi"
ODS_PERIOD_RX_BEAM = "phyPeriodic.rxBeamIdx"
ODS_PERIOD_TSF = "phyPeriodic.tsf"
ODS_PERIOD_TX_BEAM = "phyPeriodic.txBeamIdx"
ODS_PERIOD = [
    ODS_PERIOD_TX_BEAM,
    ODS_PERIOD_RX_BEAM,
    ODS_PERIOD_RSSI,
    ODS_PERIOD_TSF,
    ODS_PERIOD_LQM,
]
ODS_BWHAN_PRE = "bwhanLink"
# Current actual TX slot percentage
ODS_BWHAN_TX_SLOT_PERC = "bwhanLink.currTxSlotPercent"
ODS_BWHAN_RX_SLOT_PERC = "bwhanLink.currRxSlotPercent"
# Current L2 scheduler-proposed TX time percentage
ODS_BWHAN_TX_TIME_PERC = "bwhanLink.currTxTimePercent"
ODS_BWHAN_RX_TIME_PERC = "bwhanLink.currRxTimePercent"
ODS_BWHAN = [
    ODS_BWHAN_TX_SLOT_PERC,
    ODS_BWHAN_RX_SLOT_PERC,
    ODS_BWHAN_TX_TIME_PERC,
    ODS_BWHAN_RX_TIME_PERC,
]
ODS_STA_PRE = "staPkt"
ODS_STA_MCS = "staPkt.mcs"
ODS_STA_PER = "staPkt.perE6"
ODS_STA_TSF = "staPkt.tsf"
ODS_STA_RX_BA = "staPkt.rxBa"
ODS_STA_RX_FAIL = "staPkt.rxFail"
ODS_STA_RX_OK = "staPkt.rxOk"
ODS_STA_RX_PLCP = "staPkt.rxPlcpFil"
ODS_STA_RX_PPDU = "staPkt.rxPpdu"  # plcp protocal data unit
ODS_STA_TX_BA = "staPkt.txBa"  # block ack
ODS_STA_TX_FAIL = "staPkt.txFail"
ODS_STA_TX_OK = "staPkt.txOk"
ODS_STA_TX_EFF = "staPkt.txSlotEff"  # slot efficiency in units of 0.01%
ODS_STA_TX_EXP = "staPkt.txLifetimeExp"
ODS_STA_TX_PPDU = "staPkt.txPpdu"
ODS_STA_TX_PWR = "staPkt.txPowerIndex"
ODS_STA = [
    ODS_STA_MCS,
    ODS_STA_PER,
    ODS_STA_TSF,
    ODS_STA_RX_BA,
    ODS_STA_RX_FAIL,
    ODS_STA_RX_OK,
    ODS_STA_RX_PLCP,
    ODS_STA_RX_PPDU,
    ODS_STA_TX_BA,
    ODS_STA_TX_FAIL,
    ODS_STA_TX_OK,
    ODS_STA_TX_EXP,
    ODS_STA_TX_PPDU,
    ODS_STA_TX_PWR,
    ODS_STA_TX_EFF,
]
# end === TG FW Stats
# begin === TG Link Stats
ODS_LINK_RX_BYTES = "rx_bytes"
ODS_LINK_RX_DROPPED = "rx_dropped"
ODS_LINK_RX_ERRORS = "rx_errors"
ODS_LINK_RX_FRAME = "rx_frame"
ODS_LINK_RX_OVERRUNS = "rx_overruns"
ODS_LINK_RX_PKTS = "rx_packets"
ODS_LINK_SPEED = "speed"
ODS_LINK_TX_BYTES = "tx_bytes"
ODS_LINK_TX_DROPPED = "tx_dropped"
ODS_LINK_TX_ERRORS = "tx_errors"
ODS_LINK_TX_CARRIER = "tx_carrier"
ODS_LINK_TX_COLLISIONS = "tx_collisions"
ODS_LINK_TX_PKTS = "tx_packets"
ODS_LINK_TX_OVERRUNS = "tx_overruns"
ODS_LINK = [
    ODS_LINK_RX_BYTES,
    ODS_LINK_RX_DROPPED,
    ODS_LINK_RX_ERRORS,
    ODS_LINK_TX_BYTES,
    ODS_LINK_TX_DROPPED,
    ODS_LINK_TX_ERRORS,
    ODS_LINK_RX_FRAME,
    ODS_LINK_RX_OVERRUNS,
    ODS_LINK_RX_PKTS,
    ODS_LINK_TX_CARRIER,
    ODS_LINK_TX_OVERRUNS,
    ODS_LINK_TX_PKTS,
    ODS_LINK_TX_COLLISIONS,
]
FW_STATS_ALL = ODS_STA + ODS_PHY_DATA + ODS_PHY + ODS_BWHAN
ODS_ALL = ODS_LINK + ODS_STA + ODS_PERIOD + ODS_PHY_DATA + ODS_PHY + ODS_BWHAN
KEYS_TO_DIFF = [
    ODS_STA_RX_FAIL,
    ODS_STA_RX_OK,
    ODS_STA_RX_PLCP,
    ODS_STA_RX_BA,
    ODS_STA_TX_BA,
    ODS_STA_TX_FAIL,
    ODS_STA_TX_OK,
    ODS_STA_RX_PPDU,
    ODS_STA_TX_PPDU,
]

KEYS_TX_DIFF = [ODS_STA_TX_FAIL, ODS_STA_TX_OK, ODS_STA_TX_PPDU, ODS_STA_RX_BA]

KEYS_TX_TRAN_INFO = [
    ODS_STA_TX_FAIL,
    ODS_STA_TX_OK,
    ODS_STA_TX_PPDU,
    ODS_STA_RX_BA,
    ODS_STA_TX_EFF,
]

KEYS_RX_DIFF = [
    ODS_STA_RX_FAIL,
    ODS_STA_RX_OK,
    ODS_STA_RX_PLCP,
    ODS_STA_RX_PPDU,
    ODS_STA_TX_BA,
]


############################
# Thresholds
# TODO: need refinement if adopt ML
############################

## box alignment
THRESH_MISALIGN_DEG = 30  # deg, w.r.t. boresight
THRESH_TX_RX_DIFF_DEG = 6  # deg

## interference based on IM related
THRESH_NO_INTERF = -10  # dB
THRESH_WEAK_INTERF = 0  # dB
THRESH_STRONG_INTERF = 10  # dB
THRESH_VERYSTRONG_INTERF = 99  # dB
THRESH_POWER_INTERF = 4  # dB

## interference based on network related
THRESH_INTERF_SNR_STD_DIFF = 2  # dB

## link condition related
THRESH_STAT_TXRX_FAIL = 5  # we compare rxFail with 5 mpdu per second

## ping related
THRESH_NO_LATENCY = 10.0  # ms
THRESH_LOW_LATENCY = 50.0  # ms
THRESH_MED_LATENCY = 100.0  # ms
THRESH_HIGH_LATENCY = 150.0  # ms
THRESH_VERY_HIGH_LATENCY = 9999.0  # ms

## per hop ping latency
THRESH_PER_HOP_LATENCY_EXCELLENT = 3  # ms
THRESH_PER_HOP_LATENCY_HEALTHY = 4  # ms
THRESH_PER_HOP_LATENCY_WARNING = 5  # ms

## the num of routes a TG link supports
# TODO route stability: shall we plan adaptive relative threshold instead?
THRESH_NUM_ROUTE_TIER_1 = 15
THRESH_NUM_ROUTE_TIER_2 = 10
THRESH_NUM_ROUTE_TIER_3 = 5

## iperf related
THRESH_IPERF_EXCELLENT = 0.99  # ratio
THRESH_IPERF_OKAY = 0.95  # ratio
THRESH_IPERF_WARNING = 0.90  # ratio
THRESH_IPERF_BAD = 0.50  # ratio
THRESH_IPERF_WORST = 0.0  # ratio
WARM_UP_DELAY = 30
# multihop warm-up period: used to delete not stable samples
MUTLIHOP_WARM_UP_DELAY = 10
# multihop cool down period: used to delete not stable sample
MUTLIHOP_COOL_DOWN_DELAY = 10

THRESH_IPERF_PER_EXCEL = 0.5  # %
THRESH_IPERF_PER_OKAY = 1  # %
THRESH_IPERF_PER_WARN = 2  # %
THRESH_IPERF_MCS_EXCEL_S = 12
THRESH_IPERF_MCS_OKAY_S = 11
THRESH_IPERF_MCS_WARN_S = 9
THRESH_IPERF_MCS_EXCEL_L = 9
THRESH_IPERF_MCS_OKAY_L = 9
THRESH_IPERF_MCS_WARN_L = 7
THRESH_DIST_LONG = 100  # m
THRESH_TXSTAT_MARGIN = 0.02

## monitoring related
THRESH_MON_MCS_EXCEL = 9
THRESH_MON_MCS_OKAY = 8
THRESH_MON_MCS_WARN = 6
THRESH_MON_MCS_BADO = 2
THRESH_MON_MCS_BADC = 0

## MCS related
THRESH_MCS_DIFF = 2
THRESH_MCS_GOAL = 9

## foliage related
THRESH_FOLIAGE_LIKELY_STD_SNR = 1.5  # dB
THRESH_FOLIAGE_LIKELY_STD_RSSI = 1.5  # dB
THRESH_FOLIAGE_LIKELY_STD_TXPWRIDX = 1.5  # index change
THRESH_FOLIAGE_LIKELY_STD_PLOSS = 1.5  # dB
THRESH_FOLIAGE_STD_SNR = 2  # dB
THRESH_FOLIAGE_STD_RSSI = 2  # dB
THRESH_FOLIAGE_STD_TXPWRIDX = 3  # index change
THRESH_FOLIAGE_STD_PLOSS = 3  # dB

## reciprocal related
THRESH_RECIPROCAL_DIFF = 4.9  # dB, degree both

## connectivity related
# ratio of number of data length (days) to consider as a stable path
THRESH_STABLE_PATH_RATIO = 0.5

## Multihop Throughput Requirements
THROUGHPUT_KPI = 800  # Mbps

##
MAX_PWR_IDX = 21  # max power index allowed, it's changed since 2018
MAX_PWR_DB = 40  # dBm when it is 21


############################
# Colors
############################

COLOR_BLACK = "#212121"
COLOR_GREY = "#90A4AE"
COLOR_WHITE = "white"
COLOR_RED = "#F44336"
COLOR_BRICKRED = "#BF4040"
COLOR_YELLOW = "#FFC107"
COLOR_ORANGE = "#E65100"
COLOR_BLUE = "#67C8FF"
COLOR_DARKBLUE = "#303F9F"
COLOR_GREEN = "#4CAF50"
COLOR_PINK = "#FF00FF"
COLOR_LIGHTGREEN = "#40BFAA"
COLOR_GOLDBROWN = "#BF8040"
COLOR_GREYBLUE = "#4095BF"

########################
# Coefficient
########################
COEFF_PER = 0.0001

############################
# Database keys
############################
DB_OVERVIEW = "overview_labels"
DB_OVERVIEW_DAYS = "overview_labels_sum_days"
DB_OVERVIEW_HISTOGRAM = "overview_histograms"
DB_OVERVIEW_HISTOGRAM_DAYS = "overview_histograms_sum_days"
DB_ANALYSIS_IPERF = "analysis_iperf"

############################
# Data aggregation params
############################
DA_IMPUTATION_ITER = 5
DA_MAD_THRESH = 3.5
# DA_P75_NORMAL_DIST (0.6745) is the 75% percentile of a normal
# distribution, which is used in all MAD based outlier detection
DA_P75_NORMAL_DIST = 0.6745
DA_OUTLIER_THRESH = 4

# aggregate field key
PERE6_AVG = "perE6_avg"
PERE6_STD = "perE6_std"
IPERF_DTL_AVG = "iperf_details_avg"
IPERF_DTL_STD = "iperf_details_std"
SSNREST_AVG = "ssnrEst_avg"
TXPWR_AVG = "txPowerIndex_avg"
PING_DETAILS_AVG = "ping_details_avg"
RXFAIL_AVG = "rxFail_avg"
RXPLCPFIL_MAX = "rxPlcpFil_max"
PATHLOSS_AVG = "pathloss_avg"
SPOSTSNRDB_AVG = "spostSNRdB_avg"

SSNREST_STD = "ssnrEst_std"
MCS_STD = "mcs_std"
TXPWR_STD = "txPowerIndex_std"
PING_DETAILS_STD = "ping_details_std"
PERE6_STD = "perE6_std"
RXFAIL_STD = "rxFail_std"
PATHLOSS_STD = "pathloss_std"
SPOSTSNRDB_STD = "spostSNRdB_std"

DA_KEY_FEATURE = [MCS_P90, PERE6_AVG, IPERF_DTL_AVG, TARGET_BITRATE]
DA_SEL_FEATURE = [
    MCS_STD,
    PERE6_STD,
    IPERF_DTL_STD,
    SSNREST_AVG,
    SSNREST_STD,
    TXPWR_AVG,
    TXPWR_STD,
    RXFAIL_AVG,
    RXFAIL_STD,
    RXPLCPFIL_MAX,
    PATHLOSS_AVG,
    PATHLOSS_STD,
    PING_DETAILS_AVG,
    PING_DETAILS_STD,
    SPOSTSNRDB_AVG,
    SPOSTSNRDB_STD,
]
# IMPORTANT: This is a list of irrelevant features. The result is derived
# from PCA loading analysis and silouette analysis
DA_IRRELEVANT_FEATURE = [
    IPERF_DTL_AVG,
    MCS_STD,
    RXFAIL_AVG,
    RXFAIL_STD,
    SPOSTSNRDB_AVG,
    PERE6_STD,
    PING_DETAILS_AVG,
    PING_DETAILS_STD,
    RXPLCPFIL_MAX,
    TXPWR_STD,
]

DA_BIDIR_FEATURE = [MCS_P90, PERE6_AVG, IPERF_DTL_AVG, TXPWR_AVG, PATHLOSS_AVG]

DA_CLUSTER_NUM = 3
DA_PCA_NUM = 7
# This is an empirical value for significant correlation
DA_SIG_CORR_THRESH = 0.7

DA_ALPHA = 0.01
# This is the non-NaN data instance required to conduct the shapiro-wilk test
DA_SHAPIRO_THRESH = 3
