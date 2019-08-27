#!/usr/bin/env python3

from collections import Counter, OrderedDict
from math import ceil

# modules
import modules.keywords as KEY

# built-ins
import numpy as np


# in meters
R = 6371000.0
SPEED_OF_LIGHT = 3e8
OXYGEN_ABS_PER_M = 15 / 1000.0
DEG_IN_RAD = np.pi / 180.0
NUM_OF_ANTENNAS = 36


def mode(listOfVals):
    """
    derive the mode of a list
    """
    data = Counter(listOfVals)
    return data.most_common()[0][0]


def euclidean(a, b):
    """
    calculate euclidean distance
    """
    try:
        return np.linalg.norm(np.array(a) - np.array(b))
    except BaseException:
        return float("nan")


def pwr2db(power):
    """
    convert power to dB
    """
    if power <= 0:
        return float("-inf")
    return 10 * np.log10(power)


def db2pwr(db):
    """
    convert dB to power
    """
    if db == float("-inf"):
        return 0
    return pow(10, db / 10)


def compute_path_loss(distance, wavelength=0.005, absorb_db_per_m=0.036):
    """
    Use friis space model + oxygen absorption to estimate path loss
      20 * log10 (wavelength / 4 / pi / distance) + absorption
      wavelength = speed of light / frequency = 0.005
    Here we use seepd of light is 3e8 m/s, and freq we use is 6e9 Hz (60GHz)
    """
    if distance == 0:
        return 0
    friis_space_loss = 2 * pwr2db(wavelength / (4 * np.pi * distance))
    water_oxygen_absorption = -absorb_db_per_m * distance
    return friis_space_loss + water_oxygen_absorption


def compute_ant_gain(pnt_ang, bor_ang=0.0, num_elm=NUM_OF_ANTENNAS, useBoxModel=False):
    """
    Compute the antenna gain
    @param pnt_ang: degrees we are looking at w.r.t. the beam direction
    @param bor_ang: degrees the current beam is towards
    @param num_elm: number of antenna elements
    we can build a lookup table from actual chamber measurements
    or we can build a lookup table to speed up
    @param useBoxModel: use box model instead of sinc, by default disabled
    @param useAntModel: use antenna model instead of either sinc or box model

    """
    # TODO: Adding the antenna model as a config param from the config file
    useAntModel = False
    # Small Hack -- Use 1-tile Antenna model, need to be generalized
    oneTileAntModel = False
    # Small Hack -- Use Default Antenna model, need to be generalized
    # useBoxModel = True

    ang_diff = abs(pnt_ang - bor_ang)
    # 1-Tile Antenna model
    if oneTileAntModel:
        if ang_diff >= 270:
            return -30
        elif ang_diff >= 135:
            return -20
        elif ang_diff >= 48:
            return -20
        elif ang_diff >= 30:
            return -17
        elif ang_diff >= 15:
            return -13
        return 0
    elif useBoxModel:
        if ang_diff >= 90:
            return -45
        elif ang_diff >= 45:
            return -20
        elif ang_diff >= 16:
            return -20
        elif ang_diff >= 10:
            return -17
        elif ang_diff >= 5:
            return -13
        return 0
    elif useAntModel:
        if ang_diff >= 90:
            return -30
        elif ang_diff >= 45:
            return -20
        elif ang_diff >= 16:
            return -20
        elif ang_diff >= 10:
            return -17
        elif ang_diff >= 5:
            return -13
        return 0
    if ang_diff > 45:
        return -45
    # assume after 45 degrees, the box will completely block everything
    ang_diff_rad = deg2rad(ang_diff)
    # prevent zero issue
    if ang_diff_rad < 0.0001:
        return 0
    # array factor
    a_f = np.sin(num_elm * ang_diff_rad / 2) / np.sin(ang_diff_rad / 2)
    gain = 2 * pwr2db(np.sqrt(1.0 / num_elm) * a_f / np.sqrt(num_elm))
    if gain < -45:
        gain = -45
    return gain


def compute_cart_vector(lon, lat, lon_ref, lat_ref):
    """
    convert gps to x,y coordinate
    """
    x = R * (lon - lon_ref) * DEG_IN_RAD * np.cos((lat + lat_ref) * DEG_IN_RAD / 2.0)
    y = R * ((lat - lat_ref) * DEG_IN_RAD)
    return (x, y)


def compute_distance(pos, posBase):
    """
    compute two points distance (x,y coordinate based)
    @param pos: position [x, y] or (x, y)
    @param posBase: the same, [x, y] or (x, y)
    """
    lon, lat = pos
    lonBase, latBase = posBase
    x, y = compute_cart_vector(lon, lat, lonBase, latBase)
    return np.sqrt(x * x + y * y)


def compute_angle(pos, posBase):
    """
    compute two points (vector w.r.t. posBase) angle/orientation
    @return angle in degree
    """
    lon, lat = pos
    lonBase, latBase = posBase
    x, y = compute_cart_vector(lon, lat, lonBase, latBase)
    return rad2deg(np.arctan2(y, x))


def compute_angle_diff(angle, angleBase, flip=False):
    """
    calculate angle difference for two links
    @param angle: in deg
    @param angleBase: in deg
    don't change this function if you don't know what you're doing
    """
    ang_diff = 0
    ang_diff = angle - angleBase
    if flip:
        ang_diff = 180 - ang_diff
    ang_diff = abs(ang_diff)
    if ang_diff > 180:
        ang_diff = 360 - ang_diff
    if ang_diff > 90:
        ang_diff = 180 - ang_diff
    return ang_diff


def sinr_to_mcs_thrpt(sinr):
    """
    convert sinr to mcs and throughput based on mapping table
    this is 802.11ad projection
    """
    try:
        sinr = float(sinr)
    except BaseException as ex:
        print("error converting", ex)
        return float("nan"), float("nan")
    mappingTable = [
        (1, 1, 385),
        (2.5, 2, 770),
        (3, 3, 962.5),
        (4.5, 4, 1155),
        (5, 5, 1251.25),
        (5.5, 6, 1540),
        (7.5, 7, 1925),
        (9, 8, 2310),
        (12, 9, 2502.5),
        (14, 10, 3080),
        (16, 11, 3850),
        (18, 12, 4620),
    ]
    for snr, mcs, thrpt in mappingTable:
        if sinr > snr:
            continue
        return mcs, thrpt
    if sinr > snr:
        return mcs, thrpt
    return float("nan"), float("nan")


def deg2rad(deg):
    return deg / 180 * np.pi


def rad2deg(rad):
    return rad / np.pi * 180


def index2deg(myIdx, roundDigit=2):
    """
    convert index to angle w.r.t. broadside
    """
    if myIdx is None or np.isnan(myIdx):
        return myIdx
    myIdx = int(myIdx)
    if myIdx < 32:
        return round(-myIdx * 45.0 / 31, roundDigit)
    return round((myIdx - 31) * 45.0 / 32, roundDigit)


def deg2index(myAng):
    """
    convert angle to index w.r.t. broadside
    """
    if myAng > 0:
        return int(round(myAng * 32.0 / 45)) + 31
    return int(round(-myAng * 31.0 / 45))


def sin(angle, unit="deg"):
    """
    compute sine
    """
    if unit == "deg":
        return np.sin(angle * DEG_IN_RAD)
    return np.sin(angle)


def cos(angle, unit="deg"):
    """
    compute sine
    """
    if unit == "deg":
        return np.cos(angle * DEG_IN_RAD)
    return np.cos(angle)


def abs(num):
    """
    compute absolute number
    """
    try:
        return np.abs(num)
    except BaseException:
        return None
    return float("nan")


def isnan(num):
    """
    check if it is nan value
    """
    return np.isnan(num)


def nanratio(lst):
    """
    compute the ratio of nan over all elements in list
    """
    try:
        if len(lst) is 0:
            return 0
    except BaseException:
        return None
    try:
        nan_count = np.count_nonzero(np.isnan(lst))
    except BaseException:
        nan_count = np.sum(np.isnan(lst))
    if np.isnan(nan_count):
        return float("nan")
    return 1.0 * nan_count / len(lst)


def min(lst):
    """
    compute min (excluding nan) of a list of numbers
    """
    try:
        if len(lst) is 0:
            return float("nan")
    except BaseException:
        return float("nan")
    return np.nanmin(lst)


def max(lst):
    """
    compute max (excluding nan) of a list of numbers
    """
    try:
        if len(lst) is 0:
            return float("nan")
    except BaseException:
        raise
        return float("nan")
    return np.nanmax(lst)


def dbToLinear(lst):
    """
    convert a list in dB domain to linear domain
    """
    try:
        if len(lst) is 0:
            return []
    except BaseException:
        return None
    return np.power(10, np.divide(lst, 10))


def mean(lst):
    """
    compute mean (excluding nan) of a list of numbers
    """
    try:
        if len(lst) is 0:
            return float("nan")
    except BaseException:
        return float("nan")
    try:
        tmp = np.count_nonzero(~np.isnan(lst))
    except Exception:
        tmp = np.sum(~np.isnan(lst))
    tmp2 = np.nansum(lst)
    if tmp is 0 or np.isnan(tmp2):
        return float("nan")
    return 1.0 * tmp2 / tmp


def percentiles(lst, percentage):
    """
    calculate percentiles of a list of numbers
    """
    try:
        if len(lst) is 0:
            return float("nan")
    except BaseException:
        return float("nan")
    value = np.percentile(lst, percentage)
    return value


def median(lst):
    """
    compute median (excluding nan) of a list of numbers
    """
    try:
        if len(lst) is 0:
            return float("nan")
    except BaseException:
        return float("nan")
    lst = np.array(lst)
    newlst = lst[~np.isnan(lst)]
    if len(newlst) is 0:
        return float("nan")
    return np.median(newlst)


def std(lst):
    """
    compute std (excluding nan) of a list of numbers
    """
    try:
        if len(lst) is 0:
            return float("nan")
    except BaseException:
        return float("nan")
    try:
        return np.nanstd(lst)
    except Exception:
        pass
    lst = np.array(lst)
    tmp = mean(lst)
    if np.isnan(tmp):
        return float("nan")
    return np.sqrt(mean(abs(lst - tmp) ** 2))


def translate_tx_power(txPowerIndex):
    """
    This function converts tx power index to power in dB domain
    @param txPowerIndex: tx power index from fw_stats
    """
    if txPowerIndex >= KEY.MAX_PWR_IDX:
        txPower = KEY.MAX_PWR_DB + 0.5 * (txPowerIndex - KEY.MAX_PWR_IDX)
    else:
        txPower = KEY.MAX_PWR_DB - (KEY.MAX_PWR_IDX - txPowerIndex)
    return txPower


def translate_tx_power_idx(txPower_dB):
    """
    This function (tries) to convert tx power in dB to power index
    @param txPower: tx power
    """
    if txPower_dB > KEY.MAX_PWR_DB:
        return int(round((txPower_dB - KEY.MAX_PWR_DB) / 0.5)) + KEY.MAX_PWR_IDX
    return KEY.MAX_PWR_IDX - int(round((KEY.MAX_PWR_DB - txPower_dB)))


def calc_pathloss(txPower, rssi):
    """
    calculate pathloss

    @param txPower: list of tuples [(time, txPwrIdx), ...]
    @param rssi: list of tuples [(time, rssi), ...]
    @return list of tupes [(time, pathloss)]
    """
    pathloss = []
    if not txPower or not rssi:
        return pathloss
    if not len(txPower) == len(rssi):
        return pathloss
    # convert [(time, txPwrIdx)] to [(time, actual tx power)]
    txPowerVals = [(t, translate_tx_power(p)) for t, p in txPower]
    for i in range(len(txPowerVals)):
        t1 = txPowerVals[i][0]
        t2 = rssi[i][0]
        if t1 is not t2:
            continue
        pathloss.append((t1, txPowerVals[i][1] - rssi[i][1]))
    return pathloss


def get_histogram(
    standardDict, targetKey, perDirection=False, roundDigit=0, roundBase=1
):
    """
    @param standardDict: assume it follows format {link: {A2Z: {}, Z2A: {}}}
    @param targetKey: either for bi-directional link, or for uni-link (and node)
    @param perDirection: whether we are looking at per-uniLink or per-biLink
                    set perDirection=True for per-uniLink; otherwise per-biLink
    @param roundDigit: 0 means round to integer, round(xx, roundDigit)
    @param roundBase: e.g., roundBase=5 means round number UP to every 5
    """

    def get_count_plus_one(myDict, targetKey, hist):
        if not myDict:  # anything coming in will be `nan`
            return
        myVal = round(
            roundBase * ceil(myDict.get(targetKey, float("nan")) / roundBase),
            roundDigit,
        )
        if isnan(myVal):
            hist["nan_count"] += 1
            return
        if roundDigit <= 0:
            myVal = int(myVal)
        hist["total_count"] += 1
        if myVal not in hist["details_num"]:
            hist["details_num"][myVal] = 0
        hist["details_num"][myVal] += 1

    hist = {"total_count": 0, "details_num": {}, "nan_count": 0}
    if not standardDict:
        return hist
    for link in standardDict:
        if perDirection:
            get_count_plus_one(standardDict[link].get(KEY.A2Z, {}), targetKey, hist)
            get_count_plus_one(standardDict[link].get(KEY.Z2A, {}), targetKey, hist)
        else:
            get_count_plus_one(standardDict[link], targetKey, hist)
    hist["details_num"] = OrderedDict(sorted(hist["details_num"].items()))
    return hist
