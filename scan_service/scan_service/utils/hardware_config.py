# Copyright 2004-present Facebook. All Rights Reserved.

import dataclasses
from typing import List


@dataclasses.dataclass
class HardwareConfig:
    # Beam order
    BEAM_ORDER: List[int]
    # Beamwidth of the broadside beam (in terms of index)
    BORESIDE_BW_IDX: int
    # Minimum reporeted RSSI in dBm
    MINIMUM_RSSI_DBM: int
    # Minimum reporeted SNR in dB
    MINIMUM_SNR_DB: int
    # Threshold to judge if RSSI is saturated
    RSSI_SATURATE_THRESH_DBM: int
    # Threshold to judge if SNR is saturated
    SNR_SATURATE_THRESH_DB: int
    # How far two identified routes should be (in idx)
    BEAM_SEPERATE_IDX: int
    # Maximum expected sidelobe level
    MAX_SIDELOBE_LEVEL_DB: int
    # Max beam index
    MAX_BEAM_INDEX: int
    # Min beam index
    MIN_BEAM_INDEX: int
