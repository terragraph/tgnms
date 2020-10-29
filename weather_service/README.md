# Weather Service

The weather service periodically queries information about the weather at sites
in the network. By default it is configured to connect to the
[OpenWeatherMap](https://openweathermap.org/current) current weather API. A
full example response can be found [here](https://openweathermap.org/current#current_JSON).

## Config Options

The service config options are:

 - `OpenWeatherMapKey`: API key for OpenWeatherMap
 - `scrape_interval`: Scrape interval to expose for Prometheus
 - `weather_data_fetch_interval_seconds`: How often to fetch data from the weather API
