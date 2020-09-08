#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Dict, List

from bidict import bidict


class HardwareConfig:
    # Beam order
    BEAM_ORDER: List[int]
    # txPowerIdx to txPower map
    TXPOWERIDX_TO_TXPOWER: Dict
    # beam_idx to beam angle bi directional map
    BEAMIDX_BEAM_ANGLE: bidict
    # Max beam index
    MAX_BEAM_INDEX: int
    # Min beam index
    MIN_BEAM_INDEX: int
    # Beamwidth of the broadside beam (in terms of index)
    BORESIDE_BW_IDX: int
    # Minimum reporeted SNR in dB
    MINIMUM_SNR_DB: int
    # Threshold to judge if SNR is saturated
    SNR_SATURATE_THRESH_DB: int
    # How far two identified routes should be (in idx)
    BEAM_SEPERATE_IDX: int
    # Maximum expected sidelobe level
    MAX_SIDELOBE_LEVEL_DB: int
    # Maximum power index
    MAX_PWR_IDX: int

    @classmethod
    def set_config(cls, hardware_config: Dict) -> None:
        """Set all hardware config params."""
        tx_power_idx_to_tx_power: Dict = {}
        for channel, info in hardware_config["tx_power_idx_to_tx_power"].items():
            tx_power_idx_to_tx_power[channel] = {}
            for mcs, tx_data in info.items():
                tx_power_idx_to_tx_power[channel][mcs] = {}
                for tx_power_idx, tx_power in tx_data.items():
                    tx_power_idx_to_tx_power[channel][mcs][int(tx_power_idx)] = tx_power

        beam_idx_to_beam_angle: bidict = bidict()
        for beam_idx, beam_angle in hardware_config["beam_idx_to_beam_angle"].items():
            beam_idx_to_beam_angle[int(beam_idx)] = beam_angle

        beam_order: List[int] = [
            beam_idx_to_beam_angle.inverse[angle]
            for angle in sorted(beam_idx_to_beam_angle.values())
        ]

        constants = hardware_config["constants"]
        cls.BEAM_ORDER = beam_order
        cls.TXPOWERIDX_TO_TXPOWER = tx_power_idx_to_tx_power
        cls.BEAMIDX_BEAM_ANGLE = beam_idx_to_beam_angle
        cls.MAX_BEAM_INDEX = max(beam_idx_to_beam_angle)
        cls.MIN_BEAM_INDEX = min(beam_idx_to_beam_angle)
        cls.BORESIDE_BW_IDX = constants["BORESIDE_BW_IDX"]
        cls.MINIMUM_SNR_DB = constants["MINIMUM_SNR_DB"]
        cls.SNR_SATURATE_THRESH_DB = constants["SNR_SATURATE_THRESH_DB"]
        cls.BEAM_SEPERATE_IDX = constants["BEAM_SEPERATE_IDX"]
        cls.MAX_SIDELOBE_LEVEL_DB = constants["MAX_SIDELOBE_LEVEL_DB"]
        cls.MAX_PWR_IDX = constants["MAX_PWR_IDX"]

    @classmethod
    def get_adjacent_beam_index(cls, beam_idx: int, add: bool = True) -> int:
        """Get adjacent beam index using beam order."""
        index = cls.BEAM_ORDER.index(beam_idx)
        if (index == 0 and not add) or (index == len(cls.BEAM_ORDER) - 1 and add):
            return beam_idx
        return cls.BEAM_ORDER[(index + 1) if add else (index - 1)]
