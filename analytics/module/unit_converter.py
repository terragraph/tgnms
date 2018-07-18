#!/usr/bin/env python3

""" Provide UnitConverter class for for unit/metric conversion.
"""


class UnitConverter(object):
    """
    Collections of commonly used unit/metric conversion functions.
    """

    def tx_power_idx_to_power_dbm(self, power_idx):
        """
        This function converts tx power index to tx power in dBm.

        Args:
        power_idx: tx power index from firmware.

        Return:
        power_in_dbm: power in dBm.
        """

        max_power_dbm = 46  # 46 dBm
        max_power_index = 28
        power_cut_off = 21

        if power_idx >= power_cut_off:
            power_in_dbm = max_power_dbm - 0.5 * (max_power_index - power_idx)
        else:
            power_in_dbm = max_power_dbm - 0.5 * (max_power_index - power_cut_off)
            power_in_dbm = power_in_dbm - (power_cut_off - power_idx)
        return power_in_dbm

    def tx_power_dbm_to_power_idx(self, power_in_dbm):
        """
        This function translates tx_power in dBm to tx_power_idx, i.e., is the
        inverse of tx_power_idx_to_power_dbm().

        Args:
        power_in_dbm: tx_power measured in dbm.

        Return:
        power_idx: tx power index (currently between 1-28).
        """

        power_cut_off = 42.5

        if power_in_dbm > power_cut_off:
            # For power smaller than the cut_off, 1 idx equals 0.5 dBm
            power_idx = 21 + (power_in_dbm - power_cut_off) / 0.5
        else:
            # For power smaller than the cut_off, 1 idx equals 1 dBm
            power_idx = 21 - (power_cut_off - power_in_dbm)
        return power_idx

    def bwgd_to_unix_time(self, bwgd):
        """
        Convert time from bwgd to time since epoch, i.e., is the inverse of
        unix_time_to_bwgd().

        Args:
        bwgd: reported bwgd from scan reports.

        Return:
        unix_time_in_s: time since epoch, in unit of second.
        """
        real_gps_time = bwgd * 256 / 10
        gps_time = real_gps_time - 18000
        unix_time_in_s = (gps_time + 315964800000) / 1000.0

        return unix_time_in_s

    def unix_time_to_bwgd(self, unix_time_in_s):
        """
        Convert time from time since epoch to bwgd, i.e., is the inverse of
        unix_time_to_bwgd(). See comments for detailed conversion.

        Args:
        unix_time_in_s: unix time since epoch, in unit of second.

        Return:
        bwgd_idx: the converted bwgd time idx, is roundup to integer.
        """

        # Convert to GPS time.
        # GPS time starts at midnight Jan 6, 1980
        # (i.e., the midnight from Jan 5 to Jan 6), while UNIX time starts at
        # midnight Jan 1, 1970. The number of seconds between the two dates is
        # 315964800.
        gps_time = unix_time_in_s - 315964800

        # Adjust for leap seconds.
        # GPS time is not adjusted for leap seconds, while UTC is.
        # UNIX time is based on UTC. The current (Apr 2017) adjustment is
        # 18 seconds, with the last leap second added to UTC on Dec 31, 2016.
        # A leap second is added on average every 18 months.
        # A GPS device knows the difference between GPS and UTC, so in the future
        # we might want to ask a GPS device for the current difference, rather
        # than hardcode it. For our purposes, we don't mind if our calculations
        # are a second or two off. What's important is that all transmitters and
        # receivers get the same time.
        real_gps_time = gps_time + 18

        # Convert GPS time to BWGD.
        # BWGD (Bandwidth Grant Duration) is a 25.6ms (exact) interval. BWGDs
        # start at the GPS epoch and follow one another. For example, the first
        # BWGD goes from 0 to 25.6ms since the GPS epoch, and the second BWGD goes
        # from 25.6 to 51.2ms.
        # The BWGD index is floor(gps time / 25.6ms). Our calculation is a bit
        # different:
        # 1. We multiply GPS time by 1000 to convert it to milliseconds.
        # 2. We multiply GPS time by another 10, and divide by 256, rather than
        #    dividing by 25.6, thus avoiding floating point.
        # 3. We round up rather than down to give us some extra slack (we're not
        #    interested in an exact conversion, but rather in a set time in
        #    the future), thus +255.
        bwgd_index = int((real_gps_time * 1000 * 10 + 255) / 256)

        return bwgd_index
