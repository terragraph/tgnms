# Terragraph NMS
UI to visualize the terragraph wireless network.

# Developer Guide for `tgnms`
## Quick Start
```bash
cd tgnms/tgnms/fbcnms-projects/tgnms

# install dependencies
yarn

# Setup env configuration.
cat >.env <<EOQ
PORT=8080
SQLITE_DB=./nms.db
EOQ

# start local instance
yarn start
# run tests
yarn run test
# run coverage tests
yarn run test:coverage
# run linter
yarn run eslint . --fix
# run flow
flow
```



# Debugging Tools
### Setting Log-level
Logs are filtered by log-levels. To set the log-level, use the LOG_LEVEL environment variable:
```
LOG_LEVEL=<level>
```

Log-levels, from least to most verbose:
* error
* warn
* info
* debug

**Example:**
```
LOG_LEVEL=debug yarn start
```
**Logging in code:**
```
// imports the logger and tags all log statements with this file's name
const logger = require('../log')(module);
logger.debug('log a debug message');
logger.info('log an info message');
...
```
### Logging ANP API requests/responses
For fine-grained planner api debugging, pass the env-var `PLANNER_REQUEST_LOGFILE=./anplogs.txt` to write every request/response as JSON to this file.
Analyze the logfile with the jq cli utility:
```
# show the url of each request
jq -r '.request.url' < anplog.txt
# show response headers
jq -r '.response.headers["x-fb-trace-id"]' < anplog.txt
# delete things from the json file
jq 'del(.request.data)' < anplog.txt > processed.txt
```
