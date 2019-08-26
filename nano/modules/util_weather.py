#!/usr/bin/env python3

try:
    # Try Python3 first
    from urllib.request import urlopen
except ImportError:
    # Python 2
    from urllib2 import urlopen


def get_weather_info(weather_station_list):
    weather_result = {}
    for station in weather_station_list:
        url = station[0]
        print("url={}".format(url))
        try:
            weather_info_html = urlopen(url)
        except Exception as message:
            print(message)
            continue
        has_ep = False
        data_time = ""
        epoch = ""
        humidity = ""
        wind_speed = ""
        temperature = ""
        precip_rate = ""
        for line in weather_info_html:
            line = line.strip()
            if line[0:7] == '"epoch"':
                epoch = line.split(" ")[1].split(",")[0]
                has_ep = True
            if line[0:9] == '"iso8601"':
                data_time = line.split(" ")[1].split(",")[0]
            if has_ep:
                if line[0:12] == '"wind_speed"':
                    wind_speed = line.split(":")[1].strip()
                if line[0:13] == '"temperature"':
                    temperature = line.split(":")[1].strip()
                if line[0:10] == '"humidity"':
                    humidity = line.split(":")[1].strip()
                if line[0:13] == '"precip_rate"':
                    precip_rate = line.split(":")[1].strip()
                    weather_result[station[1]] = {
                        "epoch": epoch,
                        "data_time": data_time,
                        "wind_speed": wind_speed,
                        "temperature": temperature,
                        "humidity": humidity,
                        "precip_rate": precip_rate,
                    }
                    has_ep = False

    keys = sorted(
        weather_result.keys(), key=lambda x: weather_result[x]["epoch"], reverse=True
    )
    for station_idx in keys:
        print("{0}, {1}".format(station_idx, weather_result[station_idx]))
    result = {}
    if weather_result is not None:
        try:
            result = weather_result[keys[0]]
        except Exception:
            print("key not in weather_result")
    return result


def get_public_weather_info(args):
    weather_station_list = args.get("public_weather", {}).get("station_list", None)
    return get_weather_info(weather_station_list) if weather_station_list else {}
