#!/usr/bin/env python3

import modules.keywords as KEY


"""
Kernal log and r2d2 related parser functions
"""


def parse_r2d2_fw_stats(resp, filter_kw, logger, compress=False):
    """
    parse r2d2 fw stats (already filtered)
    @param resp: a list of response (as lines) from r2d2 fw_stats
    @param logger: EmptyLogger() object
    @param compress: by default, no fw stats compression
    @return stats: a list of (fw_time, val) tuples
    """
    stats = []
    logger.debug("parse {0}, total_num_lines = {1}".format(filter_kw, len(resp)))
    for line in resp:
        tmp = line.split()
        try:
            fw_time = int(tmp[0].rstrip(","))
            # TODO: parse u'65424,' with , inside the string
            try:
                val = int(tmp[2].rstrip(","))
            except ValueError:
                val = float(tmp[2].rstrip(","))
        except BaseException:
            logger.error("cannot parse val {0}".format(tmp))
            continue
        stats.append([fw_time, val])

    # By default, compute DIFF values for several Tx/Rx stats
    if len(filter_kw) > 1 and filter_kw[1] in KEY.KEYS_TO_DIFF:
        # calcluate backwards
        for j in range(len(stats) - 1, 0, -1):
            stats[j][1] -= stats[j - 1][1]
        # delete the 1st element
        if len(stats) > 0:
            del stats[0]

    # compress data: when one element equals to previous and next ones
    if compress:
        for j in range(len(stats) - 2, 0, -1):
            if stats[j][1] == stats[j + 1][1] and stats[j][1] == stats[j - 1][1]:
                del stats[j]
    return stats


def parse_kern_beam_index(resp, logger, target_mac=None):
    """
    parse kernal log for beam index in use
    @param resp: a list of response (as lines) from kern log
    @param logger: EmptyLogger() object
    @param target_mac: mac address of the peer (optional)
    @return beams: a list of (tx idx, rx idx) tuples
    """
    beams = []
    target_mac_r = ""
    marker = True
    if target_mac is not None:
        target_mac_r = " ".join(target_mac.split(":"))
        logger.debug(target_mac_r)
        # to distinguish for Y-street or PTMP
        marker = False
    txIdx = rxIdx = None
    for line in resp:
        if target_mac_r and target_mac_r in line:
            marker = True
            logger.debug(line)
            continue
        if "Beam:" not in line:
            logger.debug(line)
            continue
        elif not marker:
            logger.debug(line)
            continue
        # handle <M20 devices
        if "Tx" in line:
            tmp = line.replace(":", "").split()
            try:
                array_idx_for_tx = tmp.index("Tx")
                txIdx = int(tmp[array_idx_for_tx + 1].rstrip(","), 16)
                array_idx_for_rx = tmp.index("Rx")
                rxIdx = int(tmp[array_idx_for_rx + 1].rstrip(","), 16)
            except BaseException as ex:
                logger.debug("Problem parsing response")
                logger.debug(ex)
                logger.debug(tmp)
        # handle M21+ devices
        elif "awv" in line:
            logger.debug("With awv, line = {0}".format(line))
            tmp = line.split(" ")
            is_tx_line = False
            if "TX" in line:
                is_tx_line = True
            try:
                if is_tx_line:
                    idx = tmp.index("TX")
                else:
                    idx = tmp.index("RX")
                # current format: TX Beam: awv:239 azimuth:33 rtCalTop:65
                aziIdx = int(tmp[idx + 3].split(":")[1])
                logger.debug("aziIdx = {0}".format(aziIdx))
                if is_tx_line:
                    txIdx = aziIdx
                else:
                    rxIdx = aziIdx
            except BaseException:
                pass
        if txIdx is not None and rxIdx is not None:
            beams.append((txIdx, rxIdx))
            txIdx = rxIdx = None
            if target_mac_r:
                marker = False
    # both tx and rx idx should be very similar
    logger.debug("Identified beams (tx,rx): {0}".format(beams))
    return beams


def parse_str_per_stats(line, logger):
    """
    parse a LINE of kernal log per line for PER-related status
    @param resp: a list of response from kern log
    @param logger: EmptyLogger() object
    @return stats: a dictionary of PER-related status, each contains a value
    """
    stats = {
        KEY.TX_OK: None,
        KEY.TX_FAIL: None,
        KEY.RX_OK: None,
        KEY.RX_FAIL: None,
        KEY.RX_PLCP_FIL: None,
        KEY.TX_POWER: None,
        KEY.PER: None,
        KEY.MCS: None,
    }
    tmp = line.replace(":", "").split()
    try:
        for i in range(len(tmp)):
            if tmp[i] in stats:
                if tmp[i] == KEY.PER:
                    val = float(tmp[i + 1].rstrip(","))
                else:
                    val = int(tmp[i + 1].rstrip(","))
                stats[tmp[i]] = val
    except BaseException as ex:
        logger.debug("Problem parsing PER stats..")
        logger.debug(ex)
        logger.debug(line)
        logger.debug(stats)
    if all(val is None for val in stats.values()):
        stats = None
    return stats


def parse_kern_per_stats(resp, logger):
    """
    parse kernal log for PER status
    @param resp: a list of response (as lines) from kern log
    @param logger: EmptyLogger() object
    @return stats: a dictionary of PER-related status, each is a list of values
    """
    stats = {
        KEY.TX_OK: [],
        KEY.TX_FAIL: [],
        KEY.RX_OK: [],
        KEY.RX_FAIL: [],
        KEY.RX_PLCP_FIL: [],
        KEY.TX_POWER: [],
        KEY.PER: [],
        KEY.MCS: [],
    }
    for line in resp:
        if "txPower" not in line or "MCS" not in line:
            continue
        # parse each line
        tmp_dict = parse_str_per_stats(line, logger)
        if tmp_dict is None:
            continue
        for key in tmp_dict:
            if tmp_dict[key] is not None:
                stats[key].append(tmp_dict[key])
    logger.debug("kern_per_stats: {0}".format(stats))
    return stats


def parse_str_channel(line, logger):
    """
    parse a LINE of kernal log for channel information
    @param resp: a list of response from kern log
    @param logger: EmptyLogger() object
    @return stats: a dictionary of channel status, each contains a value
    """
    stats = {
        KEY.RSSI: None,
        KEY.SNR: None,
        KEY.POSTSNR: None,
        KEY.IF_GAIN: None,
        KEY.RF_GAIN: None,
        KEY.RAW_RSSI: None,
    }
    tmp = line.replace(":", "").split()
    try:
        for i in range(len(tmp)):
            if tmp[i] == KEY.DATA:
                stats[KEY.DATA] = True
            elif tmp[i] == KEY.MGMT:
                stats[KEY.DATA] = False
            elif tmp[i] in stats:
                if tmp[i] == KEY.IF_GAIN or tmp[i] == KEY.RF_GAIN:
                    val = int(tmp[i + 1].rstrip(","))
                else:
                    val = float(tmp[i + 1].rstrip(","))
                stats[tmp[i]] = val
    except BaseException as ex:
        logger.debug("Problem parsing channel stats..")
        logger.debug(ex)
        logger.debug(line)
        logger.debug(stats)
    if all(val is None for val in stats.values()):
        stats = None
    return stats


def parse_kern_channel(resp, logger):
    """
    parse kern log for channel information
    @param resp: a list of response (as lines) from kern log
    @param logger: EmptyLogger() object
    @return stats: a dictionary of channel status, each is a list of values
    """
    stats = {
        KEY.DATA: [],
        KEY.RSSI: [],
        KEY.SNR: [],
        KEY.POSTSNR: [],
        KEY.IF_GAIN: [],
        KEY.RF_GAIN: [],
        KEY.RAW_RSSI: [],
    }
    for item in resp:
        if "snrEst" not in item:
            continue
        # parse each line
        tmp_dict = parse_str_channel(item, logger)
        if tmp_dict is None:
            continue
        for key in tmp_dict:
            if tmp_dict[key] is not None:
                stats[key].append(tmp_dict[key])
    logger.debug("channel stats: {0}".format(stats))
    return stats
