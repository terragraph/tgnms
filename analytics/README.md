# Network Management System (NMS) Analytics
The Analytics aims at providing tools and platforms for network analysis and optimization. Potential usage includes network health monitoring, issue pin-pointing, automative diagnostic, and data-driven controller designs.

## Architecture Overview:
Fig below depicts the major components of the NMS.

<img src="./images/system_diagram.png" height=350 width=700>

* TerraGraph(TG) network: The TG network consists of multiple nodes and is connected to the controller. Each TG node is equipped with a Stats Agent that samples and pushes stats to the Beringei Query Server (BQS).

* BQS: The BQS consumes the incoming stats, formats stats, and stores stats to the corresponding database. The BQS also interacts with UI and Analytics for stats query and (computed) stats writing.

* UI: The NMS front end reads stats (from database) via sending requests to the BQS.

* Analytics: The Analytics module reads stats from the database (via BQS) and computes link/network insights. The computed insights are then delivered. Currently, all the computed insights are stored back to both the high frequency (Beringei 30s) and low frequency database (Beringei 900s) by using the BQS.

<img src="./images/analytics_workflow.png" height=350 width=700>

The Analytics module can be divided into 3 layers: stats IO, feature mapping, and insights computing.

* Stats IO: The stats IO provides the ability to: i). read un-processed stats (from MySQL/Beringei/api service), ii). write computed stats back to the database.

* Feature mapping: The feature mapping layer maps the needed insights (like "foliage factor") to the needed raw stats (like "phystatus.rssi", "phystatus.txpowerindex").

* Insight computing: The insight computing layer hosts different models. It utilizes the fetched stats to compute insights. The insights refers to certain pre-defined metrics that are used for network monitoring, abnormal link/node pin-pointing. This layer can also hold model training once data label is available. Details on the currently available pipelines can be found in the next bullet point.

Analytics also comes with Job Scheduler modules that run insight pipelines periodically. Currently, there are two independent scheduling modules: `JobScheduler` and `CronMgmt`. The `JobScheduler` utilizes python native package `sched` and `CronMgmt` sets up and manages linux cron jobs via `crontab`.

## Link Insight Pipelines:
In Analytics, we refer to the workflow of stats query, insight computing, and stats write back for a set of metrics as a pipeline. Currently, the Analytics comes with the following pipelines:

* Downsampling

  Downsampling pipeline periodically takes raw stats from the high frequency database (currently Beringei 30s). The pipeline downsamples the stats and then save to the low frequency database (currently Beringei 900s). For each raw stats metric key (like "phystatus.ssnrest"), the pipeline stores back the number of observed data points, the mean of the data points, and the variance of the data points.

* Traffic

  Traffic pipeline computes the traffic related stats of each link. Currently, we compute the average number of packets per second (pps) and the packet error rate (per).

* Health

  Link health pipeline periodically evaluates the "health" of each link in a network. We classify the health of a link via the ratio between link available time and the observation window duration.

  The link available time is obtained by using the link up time (using mgmttx counter) and the link available counter. The link available counter is jointly decided by PER, SNR, MCS and heartbeat signals.

* Foliage

  Foliage pipeline estimates the likelihood/extend of foliage of each link. The model is built based on the observation that link pathloss of forward link and reverse link are highly correlated during windy time. Periodically, the pipeline evaluates the likelihood/extend of foliage and assigns a foliage factor. Larger foliage factor value suggests higher likelihood or more severe foliage. Via thresholding, the foliage factors  are converted to binary decisions (foliage/foliage free). On the network level, the pipeline aggregates foliage factors by counting the total number of foliage and foliage free links.

* Interference

  The interference pipeline periodically evaluates the signal strength of interference. The main idea is to use interference management (IM) scan reports to find the pathloss between any two node of any beam pairs. The instantaneous SNR, SINR, INR, INR_pilot, SINR_pilot are then computed based on the reported tx beam index and rx beam index. Links of different polarities are assumed to lead to zero interference. And links with different Golay code assignment are assumed to be early-weak interference free.

A summary of the detailed used algorithm is available [here](https://fb.quip.com/xh7oA0hhnUEW "Analytics Algorithm").


## Prod Environment Workflow:

The Analytics module will be running inside its own container. The workflow of Docker setup is the follows:

* Local testing:

  - Please make sure that Docker is installed and DNS resolution works.

  - Build docker image locally by running `build_analytics_docker.sh`.

  - Move the built image into prod box. (`docker save` and `docker load`)

  - Start the container via `docker run`.

* Deployment:

  - Option 1:

    - Staging Analytics docker, along with other docker images, using Jenkins.

    - Deploy by using `launch.sh` (in terragraph-nms repo).

  - Option 2:

    - Using `docker-compose up -d`. (docker-compsoe file is in the terragraph repo).

## Requirements:
Please refer to the Docker file.

## Testing:
* Please see example for test. To run all tests, run auto_test.sh under example/
* To locally build Analytics docker image, please run build_analytics_docker.sh

## Naming rules:
To provide readability, let"s follow the following naming rules:
* CamelCase is for classes only.
* ALL_UP_CASE is for constants only.
* small_letter is used for everything else.
* camelCase should be avoided with the best effort.
