#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Dict, List, Optional

from bidict import bidict


class HardwareConfig:
    # Beam order
    BEAM_ORDER: Dict[str, Dict[str, List]]
    # txPowerIdx to txPower map
    TXPOWERIDX_TO_TXPOWER: Dict[str, Dict[str, Dict[int, int]]]
    # beam_idx to beam angle bi directional map
    BEAMIDX_BEAM_ANGLE: Dict[str, Dict[str, bidict]]
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
    MAX_POWER: int

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

        beam_idx_to_beam_angle: Dict = {}
        for tile, tile_data in hardware_config["beam_idx_to_beam_angle"].items():
            beam_idx_to_beam_angle[tile] = {}
            for elevation, elevation_data in tile_data.items():
                beam_idx_to_beam_angle[tile][elevation] = bidict()
                beam_idx_to_beam_angle[tile][elevation].forceupdate(
                    [
                        (int(beam_idx), beam_angle)
                        for beam_idx, beam_angle in elevation_data.items()
                    ]
                )

        beam_order: Dict = {}
        for tile, tile_data in beam_idx_to_beam_angle.items():
            beam_order[tile] = {}
            for elevation, elevation_data in tile_data.items():
                beam_order[tile][elevation] = [
                    beam_idx_to_beam_angle[tile][elevation].inverse[angle]
                    for angle in sorted(
                        beam_idx_to_beam_angle[tile][elevation].values()
                    )
                ]

        constants = hardware_config["constants"]
        cls.BEAM_ORDER = beam_order
        cls.TXPOWERIDX_TO_TXPOWER = tx_power_idx_to_tx_power
        cls.BEAMIDX_BEAM_ANGLE = beam_idx_to_beam_angle
        cls.BORESIDE_BW_IDX = constants["BORESIDE_BW_IDX"]
        cls.MINIMUM_SNR_DB = constants["MINIMUM_SNR_DB"]
        cls.SNR_SATURATE_THRESH_DB = constants["SNR_SATURATE_THRESH_DB"]
        cls.BEAM_SEPERATE_IDX = constants["BEAM_SEPERATE_IDX"]
        cls.MAX_SIDELOBE_LEVEL_DB = constants["MAX_SIDELOBE_LEVEL_DB"]
        cls.MAX_POWER = constants["MAX_POWER"]

    @classmethod
    def get_pwr_offset(
        cls,
        target_pwr_idx: Optional[int] = None,
        ref_pwr_idx: Optional[int] = None,
        channel: Optional[str] = None,
        mcs: Optional[str] = None,
    ) -> int:
        """Estimate inr offset on target power idx, given inr at reference power idx."""

        if channel is None or channel not in cls.TXPOWERIDX_TO_TXPOWER:
            channel = "default_channel"
        if mcs is None or mcs not in cls.TXPOWERIDX_TO_TXPOWER[channel]:
            mcs = "default_mcs"

        target_pwr = (
            cls.MAX_POWER
            if target_pwr_idx is None
            else cls.TXPOWERIDX_TO_TXPOWER[channel][mcs][target_pwr_idx]
        )
        ref_pwr = (
            cls.MAX_POWER
            if ref_pwr_idx is None
            else cls.TXPOWERIDX_TO_TXPOWER[channel][mcs][ref_pwr_idx]
        )

        return round(target_pwr - ref_pwr)

    @classmethod
    def get_adjacent_beam_index(cls, beam_idx: int, to_add: int) -> int:
        """Get adjacent beam index using beam order."""
        for tile, elevation_data in cls.BEAM_ORDER.items():
            for elevation, beam_order in elevation_data.items():
                if beam_idx in beam_order:
                    index = beam_order.index(beam_idx)
                    res_index = index + to_add
                    if res_index <= 0 or res_index >= len(beam_order) - 1:
                        return beam_idx
                    return int(beam_order[res_index])
        return beam_idx
