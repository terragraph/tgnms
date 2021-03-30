#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Dict, Tuple


class HardwareConfig:
    # txPowerIdx to txPower map
    TXPOWERIDX_TO_TXPOWER: Dict[str, Dict[str, Dict[int, int]]]
    # Map of beam index to tuple of beam angle, elevation and tile
    BEAM_IDX_TO_TILE_ELE_ANGLE: Dict[int, Tuple[str, str, float]]

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

        cls.TXPOWERIDX_TO_TXPOWER = tx_power_idx_to_tx_power
        cls.BEAM_IDX_TO_TILE_ELE_ANGLE = {
            int(beam_idx): (tile, elevation, beam_angle)
            for tile, tile_data in hardware_config["beam_idx_to_beam_angle"].items()
            for elevation, elevation_data in tile_data.items()
            for beam_idx, beam_angle in elevation_data.items()
        }
