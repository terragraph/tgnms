### Terragraph services helm charts
This is the chart for `Terragraph services`

### Prerequisites
- Kubernetes 1.10+ with Beta APIs enabled
- PV provisioner support in the underlying infrastructure

### Installing the Chart
To install the chart with the release name `<release name>` in namespace `<namespace>`:
Replace `<release name>` and `<namespace>` with your values, the namespace should exist in the target cluster.
```bash
$ helm upgrade --install cm --namespace <namespace> ./tgnms/charts/database -f vals.yml
$ helm upgrade --install db --namespace <namespace> ./tgnms/charts/database -f vals.yml
$ helm upgrade --install ch --namespace <namespace> ./tgnms/charts/database -f vals.yml
$ helm upgrade --install e2e --namespace <namespace> ./tgnms/charts/database -f vals.yml
``` 

### Uninstalling the Chart
To uninstall/delete the `db` deployment from `tg` namespace:
```bash
$ helm delete cm --namespace tg
$ helm delete db --namespace tg
$ helm delete ch --namespace tg
$ helm delete e2e --namespace tg
```
The command removes all the Kubernetes components associated with the
`common, database, chihaya`and `e2e-ctl` helm charts and deletes the
`cm, db, ch` and `e2e` releases completely from `tg` namespace.

### Common chart configuration
The following table lists the configurable parameters of the `Common` helm chart and their default values.

| Parameter                                    | Description                                                         | Default                                   |
| -------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `imagePullSecrets`                           | Hold names of `Docker registry` k8s manifest secrets                | `[]`                                      |
| `commonCreate`                               | Frag if true installs `common chart`, otherwise it's not installed  | `false`                                   |
| `tgnms.common.timeZonePath`                   | `Time zone` used.                                                   | `/usr/share/zoneinfo/America/Los_Angeles` |


### Database chart configuration
The following table lists the configurable parameters of the `MySQL` chart and their default values.

| Parameter                                 | Description                                                          | Default                      |
| ----------------------------------------- | -------------------------------------------------------------------- | ---------------------------- |
| `imagePullSecrets`                        | Name of Secret resource containing private registry credentials      | `nil`                        |
| `databaseCreate`                          | Frag if true installs `chihaya chart`, otherwise it's not installed  | `nil`                        |
| `tgnms.database.image.repository`          | `mysql` image repository.                                            | `mysql`                      |
| `tgnms.database.image.tag`                 | `mysql` image tag.                                                   | `5.7.30`                     |
| `tgnms.database.image.pullPolicy`          | `mysql`mage pull policy                                              | `IfNotPresent`               |
| `tgnms.database.env.rootUser`              | Username for the `root` to create.                                   | `root`                       |
| `tgnms.database.env.rootPass`              | Password for the `root` user. Ignored if existing secret is provided | `root`                       |
| `tgnms.database.env.dbUser`                | Username of new user to create.                                      | `nms`                        |
| `tgnms.database.env.dbPass`                | Password for the new user. Ignored if existing secret is provided    | `nil`                        |
| `tgnms.database.env.dbName`                | Name for new database to create.                                     | `cxl`                        |
| `tgnms.database.deployment.nodeSelector`   | Node labels for pod assignment                                       | `{}`                         |
| `tgnms.database.deployment.affinity`       | Affinity rules for pod assignment                                    | `{}`                         |
| `tgnms.database.deployment.resources`      | CPU/Memory resource requests/limits                                  | Memory: `256Mi`, CPU: `100m` |
| `tgnms.database.deployment.tolerations`    | Pod taint tolerations for deployment                                 | `{}`                         |
| `tgnms.database.deployment.podAnnotations` | Map of annotations to add to the pods                                | `{}`                         |
| `tgnms.database.deployment.podLabels`      | Map of labels to add to the pods                                     | `{}`                         |
| `tgnms.database.deployment.strategy`       | Update strategy policy                                               | `{type: "Recreate"}`         |
| `tgnms.database.persistence.enabled`       | Create a volume to store data                                        | `true`                       |
| `tgnms.database.persistence.size`          | Size of persistent volume claim                                      | `8Gi` RW                     |
| `tgnms.database.persistence.storageClass`  | Type of persistent volume claim                                      | `nil`                        |
| `tgnms.database.persistence.accessMode`    | ReadWriteOnce or ReadOnly                                            | `ReadWriteOn`                |
| `tgnms.database.persistence.path`          | Subdirectory of the volume to mount                                  | `nil`                        |
| `tgnms.database.persistence.annotations`   | Persistent Volume annotations                                        | `{}`                         |
| `tgnms.database.service.annotations`       | Kubernetes annotations for mysql                                     | `{}`                         |
| `tgnms.database.service.type`              | Kubernetes service type                                              | `ClustIP`                    |
| `tgnms.database.service.loadBalancerIP`    | LoadBalancer service IP                                              | `""`                         |

### Chihaya chart configuration
The following table lists the configurable parameters of the `Chihaya` helm chart and their default values.

| Parameter                                    | Description                                                         | Default                       |
| -------------------------------------------- | ------------------------------------------------------------------- | ----------------------------- |
| `imagePullSecrets`                           | Hold names of `Docker registry` k8s manifest secrets                | `[]`                          |
| `chihayaCreate`                              | Frag if true installs `chihaya chart`, otherwise it's not installed | `false`                       |
| `tgnms.chihaya.image.repository`              | `chihaya` image repository.                                         | `quay.io/jzelinskie/chihaya`  |
| `tgnms.chihaya.image.tag`                     | `chihaya` image tag.                                                | `v2.0.0-rc.2`                 |
| `tgnms.chihaya.image.pullPolicy`              | `chihaya`mage pull policy                                           | `IfNotPresent`                |
| `tgnms.chihaya.configmap.chihayaConfigFile`   | Path of Chihaya configuration file to use in k8s ConfigMap manifest | `./tgnms/scripts/chihaya.yml` |
| `tgnms.chihaya.service.name`                  | Kubernetes service name                                             | `chahaya`                     |
| `tgnms.chihaya.service.annotations`           | Kubernetes annotations for chihaya                                  | `{}`                          |
| `tgnms.chihaya.service.labels`                | Kubernetes labels for chihaya                                       | `{}`                          |
| `tgnms.chihaya.service.type`                  | Kubernetes service type                                             | `ClusterIP`                   |
| `tgnms.chihaya.service.port`                  | Kubernetes service exposed port                                     | `6969`                        |
| `tgnms.chihaya.service.targetPort`            | Kubernetes service target port in container                         | `6969`                        |
| `tgnms.chihaya.service.nodePort`              | Kubernetes service node port if used                                | `nil`                         |
| `tgnms.chihaya.service.externalTrafficPolicy` | Kubernetes service external traffic policy                          | `Cluster`                     |
| `tgnms.chihaya.service.loadBalancerIP`        | LoadBalancer service IP                                             | `{}`                          |
| `tgnms.chihaya.deployment.replicas`           | Pods number to assure running                                       | `1`                           |
| `tgnms.chihaya.deployment.strategy.type`      | Update `strategy` policy                                            | `Recreate`                    |
| `tgnms.chihaya.deployment.configSubPath`      | Sub path of `chihaya` configuration file in running container       | `chihaya.yml`                 |
| `tgnms.chihaya.deployment.podAnnotations`     | Map of `annotations` to add to the pods                             | `{}`                          |
| `tgnms.chihaya.deployment.nodeSelector`       | Node labels for pod assignment                                      | `{}`                          |
| `tgnms.chihaya.deployment.tolerations`        | Pod taint `tolerations` for deployment                              | `{}`                          |
| `tgnms.chihaya.deployment.affinity`           | `Affinity` rules for pod assignment                                 | `{}`                          |
| `tgnms.chihaya.deployment.resources`          | CPU/Memory `resource` requests/limits                               | `{}`                          |
| `tgnms.chihaya.deployment.podLabels`          | Map of `labels` to add to the pods                                  | `{}`                          |

### E2E Controller chart configuration
The following table lists the configurable parameters of the `e2e-ctl` helm chart and their default values.

| Parameter                                   | Description                                                                | Default                                        |
| ------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- |
| `imagePullSecrets`                          | Hold names of `Docker registry` k8s manifest secrets                       | `[]`                                           |
| `e2eControllerCreate`                       | Frag if true installs `e2e-ctl chart`, otherwise it's not installed        | `false`                                        |
| `tgnms.e2ectl.image.repository`              | `e2e-controller` image repository.                                         | `secure.cxl-terragraph.com:443/e2e-controller` |
| `tgnms.e2ectl.image.tag`                     | `e2e-controller` image tag.                                                | `latest`                                       |
| `tgnms.e2ectl.image.pullPolicy`              | `e2e-controller`mage pull policy                                           | `Always`                                       |
| `tgnms.e2ectl.controllers.name`                     | `controller` server name                                                   | `dev_example_first`                            |
| `tgnms.e2ectl.controllers.ctlPort`                  | `controller` server port                                                   | `7007`                                         |
| `tgnms.e2ectl.controllers.aggPort`                  | `controller` server aggregator port                                        | `8002`                                         |
| `tgnms.e2ectl.controllers.appPort`                  | `controller` server app port                                               | `17077`                                        |
| `tgnms.e2ectl.controllers.btSeederPort`             | `controller` server BT Seeder port                                         | `6881`                                         |
| `tgnms.e2ectl.persistence.size`              | Size of persistent volume claim                                            | `5Gi` RW                                       |
| `tgnms.e2ectl.persistence.storageClass`      | Type of persistent volume claim                                            | `manual`                                       |
| `tgnms.e2ectl.persistence.accessMode`        | ReadWriteOnce or ReadOnly                                                  | `ReadWriteOn`                                  |
| `tgnms.e2ectl.persistence.path`              | Subdirectory of the volume to mount                                        | `/tmp/data`                                    |
| `tgnms.e2ectl.persistence.type`              | Persistent Volume type                                                     | `local`                                        |
| `tgnms.e2ectl.env.apiArgs`                   | `controller` API arguments                                                 | `{}`                                           |
| `tgnms.e2ectl.env.e2ePath`                   | `e2e` path                                                                 | `/opt/terragraph/gfs/e2e`                      |
| `tgnms.e2ectl.env.e2eConfigFile`             | `controller` configuration file path                                       | `cfg/controller_config.json`                   |
| `tgnms.e2ectl.env.e2eTopologyFile`           | `topology` configuration file path                                         | `e2e_topology.conf`                            |
| `tgnms.e2ectl.env.nmsConfigFile`             | `aggregator` configuration file path                                       | `cfg/aggregator_config.json`                   |
| `tgnms.e2ectl.env.e2eAuditLogsPath`          | `e2e audit` log files path                                                 | `/opt/terragraph/gfs/audit_logs/example_first` |
| `tgnms.e2ectl.env.tgAggregatorHost`          | `aggregator` host name                                                     | `{}`                                           |
| `tgnms.e2ectl.env.tgBtAnnounceIP`            | `BT Announce` IP address                                                   | `{}`                                           |
| `tgnms.e2ectl.env.tgBtSeederPort`            | `BT Seeder` port                                                           | `6881`                                         |
| `tgnms.e2ectl.env.tgBtTrackerOverride`       | `BT Tracker` host override                                                 | `http://[]:6969/announce`                      |
| `tgnms.e2ectl.env.tgControllerHost`          | `controller` host name                                                     | `e2e_controller-example_first`                 |
| `tgnms.e2ectl.env.tgLocalBtTrackerOverrride` | `Local BT Tracker` host override                                           | `http://chihaya:6969/announce`                 |
| `tgnms.e2ectl.env.tgNmsRemoteEndpoint`       | `NMS` Remote Endpoint                                                      | `http://query_service:8086/`                   |
| `tgnms.e2ectl.configmap.startAgent`          | Path of e2e agent configuration file to use in k8s ConfigMap manifest      | `../scripts/start_agent.start`                 |
| `tgnms.e2ectl.configmap.startCtl`            | Path of e2e controller configuration file to use in k8s ConfigMap manifest | `../scripts/start_controller.start`            |
| `tgnms.e2ectl.configmap.startAgg`            | Path of aggregator configuration file to use in k8s ConfigMap manifest     | `../scripts/start_aggregator.start`            |
| `tgnms.e2ectl.configmap.topologyConf`        | Path of topology configuration file to use in k8s ConfigMap manifest       | `../scripts/e2e_topology.conf`                 |
| `tgnms.e2ectl.service.name`                  | Kubernetes service name                                                    | `chahaya`                                      |
| `tgnms.e2ectl.service.annotations`           | Kubernetes annotations for e2ectl                                          | `{}`                                           |
| `tgnms.e2ectl.service.labels`                | Kubernetes labels for e2ectl                                               | `{}`                                           |
| `tgnms.e2ectl.service.type`                  | Kubernetes service type                                                    | `ClusterIP`                                    |
| `tgnms.e2ectl.service.port`                  | Kubernetes service exposed port                                            | `80`                                           |
| `tgnms.e2ectl.service.targetPort`            | Kubernetes service target port in container                                | `80`                                           |
| `tgnms.e2ectl.service.nodePort`              | Kubernetes service node port if used                                       | `nil`                                          |
| `tgnms.e2ectl.service.externalTrafficPolicy` | Kubernetes service external traffic policy                                 | `Cluster`                                      |
| `tgnms.e2ectl.service.loadBalancerIP`        | LoadBalancer service IP                                                    | `{}`                                           |
| `tgnms.e2ectl.deployment.replicas`           | Pods number to assure running                                              | `1`                                            |
| `tgnms.e2ectl.deployment.strategy.type`      | Update `strategy` policy                                                   | `Recreate`                                     |
| `tgnms.e2ectl.deployment.podAnnotations`     | Map of `annotations` to add to the pods                                    | `{}`                                           |
| `tgnms.e2ectl.deployment.nodeSelector`       | Node labels for pod assignment                                             | `{}`                                           |
| `tgnms.e2ectl.deployment.tolerations`        | Pod taint `tolerations` for deployment                                     | `{}`                                           |
| `tgnms.e2ectl.deployment.affinity`           | `Affinity` rules for pod assignment                                        | `{}`                                           |
| `tgnms.e2ectl.deployment.resources`          | CPU/Memory `resource` requests/limits                                      | `{}`                                           |
| `tgnms.e2ectl.deployment.podLabels`          | Map of `labels` to add to the pods                                         | `{}`                                           |
