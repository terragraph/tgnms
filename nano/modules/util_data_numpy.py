#!/usr/bin/env python3

import numpy as np
from modules.addon_misc import get_range


def get_np_from_rows(
    samples, a_mac_list, z_mac_list, key_list, start_time, end_time, window
):
    """
    key_list: list of keys, all of them should be either link stats or node stats
    a_mac_list, z_mac_list:
    for node stats, z_mac_list = [], a_mac_list = list of all macs
    for link stats, len(a_mac_list) == len(z_mac_list) should correspond to each link
    start_time, end_time: strings of form
    window: sampling time of stats
    """
    if not samples:
        print("No Samples found for the given query!")

    # clean up inputs
    a_mac_list = [mac.lower() for mac in a_mac_list]
    z_mac_list = [mac.lower() for mac in z_mac_list]

    # list of all links
    link_list = [
        a_mac_list[idx] + "-" + z_mac_list[idx] for idx, val in enumerate(z_mac_list)
    ]

    # clean up keys, add peer for samples, get times
    DEFAULT_MAC = "00:00:00:00:00:00"

    # create list of times
    start_time, end_time = get_range(start_time, end_time, -1, -1)
    # use appropriate time axis
    USEC_IN_SEC = int(1e6)  # microseconds in a second
    tcol = "time_us"
    start_time *= USEC_IN_SEC
    end_time *= USEC_IN_SEC
    window = int(window * USEC_IN_SEC)
    start_time = int(start_time / window) * window
    end_time = int((end_time / window) + 1) * window
    time_list = range(start_time, end_time, window)

    # fill up data to numpy array
    num_dropped = 0
    time_to_idx = {val: idx for idx, val in enumerate(time_list)}
    key_to_idx = {val: idx for idx, val in enumerate(key_list)}
    mac_to_idx = {val: idx for idx, val in enumerate(a_mac_list)}
    link_to_idx = {val: idx for idx, val in enumerate(link_list)}
    NUM_DIRECTIONS = 2
    if z_mac_list:
        shape = (len(a_mac_list), NUM_DIRECTIONS, len(time_list), len(key_list))
    else:
        shape = (len(a_mac_list), len(time_list), len(key_list))
    data = np.zeros(shape)
    validity = np.zeros(shape, dtype=bool)
    for samp in samples:
        mac = samp["node"]
        time = int(samp[tcol] / window) * window
        key = samp["key"]
        peer = samp["peer"]
        value = samp["value"]
        if bool(z_mac_list) == (peer == DEFAULT_MAC):
            # either z_mac_list provided but stat is node specific
            # or z_mac_list not provided but stat is link specific
            num_dropped += 1
            continue
        try:
            if z_mac_list:
                link = mac + "-" + peer
                if link in link_list:
                    direction = 0
                else:
                    link = peer + "-" + mac
                    direction = 1
                indexes = (
                    link_to_idx[link],
                    direction,
                    time_to_idx[time],
                    key_to_idx[key],
                )
            else:
                indexes = (mac_to_idx[mac], time_to_idx[time], key_to_idx[key])
            data[indexes] = value
            validity[indexes] = True
        except KeyError:
            num_dropped += 1
            pass

    if z_mac_list:
        axes = {
            "links": link_list,
            "directions": ["-->", "<--"],
            "keys": key_list,
            "times": np.array(time_list),
        }
    else:
        axes = {"macs": a_mac_list, "keys": key_list, "times": np.array(time_list)}

    return {
        "data": data,
        "validity": validity,
        "axes": axes,
        "num_samples": len(samples),
        "num_dropped": num_dropped,
    }


def apply_along_axis_kd(func, axis, arrs, *args, **kwargs):
    """
    arrs, shape of all elements is same
    func inputs are list of 1d np.array, *args, **kwargs
    func output is list of scalars
    implementation similar to np.apply_along_axis
    """

    # arr, with the iteration axis at the end
    in_dims = list(range(arrs[0].ndim))
    inarr_views = [
        np.transpose(arr, in_dims[:axis] + in_dims[axis + 1 :] + [axis]) for arr in arrs
    ]

    # compute indices for the iteration axes, and append a trailing ellipsis to
    inds = np.ndindex(inarr_views[0].shape[:-1])
    inds = (ind + (Ellipsis,) for ind in inds)

    # iterate
    for i, ind in enumerate(inds):
        outs = func([inarr_view[ind] for inarr_view in inarr_views], *args, **kwargs)
        if i == 0:
            buffs = [np.zeros(inarr_views[0].shape[:-1]) for out in outs]
        for out_idx, out in enumerate(outs):
            buffs[out_idx][ind] = out

    return buffs
