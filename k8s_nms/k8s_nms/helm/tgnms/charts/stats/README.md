### Terragraph stats service helm chart
This is a chart for the `Terragraph stats service`

### Prerequisites
- Kubernetes 1.10+ with Beta APIs enabled

### Installing the Chart
To install the chart with the release name `<release name>` in namespace `<namespace>`:
Replace `<release name>` and `<namespace>` with your values, the namespace should exist in the target cluster.
```bash
$ helm upgrade --install <release name> --namespace <namespace> ./tgnms/charts/stats -f vals.yml
```

### Uninstalling the Chart
To uninstall/delete the `sts` deployment from `tg` namespace:
```bash
$ helm delete sts --namespace tg
```
The command removes all the Kubernetes components associated with the `stats helm chart` and
deletes the `sts release` completely from `tg` namespace.

### Configuration
The following table lists the configurable parameters of the `stats` helm chart and their default values.

| Parameter                                      | Description                                                       | Default                   |
| ---------------------------------------------- | ----------------------------------------------------------------- | ------------------------- |
| `imagePullSecrets`                             | Hold names of `Docker registry` k8s manifest secrets              | `[]`                      |
| `statsCreate`                                  | Frag if true installs `stats chart`, otherwise it's not installed | `false`                   |
| `tgnms.stats.env.promCacheLimit`                | `Prometheus` cache limit                                          | `nil`                     |
| `tgnms.stats.env.alertMgrPort`                  | `Alert manager` port                                              | `nil`                     |
| `tgnms.stats.env.rulesDir`                      | Rules directory path                                              | `nil`                     |
| `tgnms.stats.env.promUrl`                       | `Prometheus` URL                                                  | `nil`                     |
| `tgnms.stats.env.alertMrgConfPort`              | `Alert manager configurer` port                                   | `nil`                     |
| `tgnms.stats.env.alertMrgConfPath`              |`Alert manager configurer` path                                    | `nil`                     |
| `tgnms.stats.env.alertMrgUrl`                   | `Alert manager configurer` URL                                    | `nil`                     |
| `tgnms.stats.env.multitenant`                   | `Multitenant` enabler                                             | `false`                   |
| `tgnms.stats.images.pullPolicy`                 | `stats` images pull policy                                        | `IfNotPresent`            |
| `tgnms.stats.image.prom.repository`             | `prometheus` image repository.                                    | `prom/prometheus`         |
| `tgnms.stats.image.prom.tag`                    | `prometheus` image tag.                                           | `latest`                  |
| `tgnms.stats.image.alertmgr.repository`         | `alert manager` image repository.                                 | `prom/alertmanager`       |
| `tgnms.stats.image.alertmgr.tag`                | `alert manager` image tag.                                        | `latest`                  |
| `tgnms.stats.image.cache.repository`            | `prometheus cache` image repository.                              | `nil`                     |
| `tgnms.stats.image.cache.tag`                   | `prometheus cache` image tag.                                     | `nil`                     |
| `tgnms.stats.image.promconf.repository`         | `prometheus configurer` image repository.                         | `nil`                     |
| `tgnms.stats.image.promconf.tag`                | `prometheus configurer` image tag.                                | `nil`                     |
| `tgnms.stats.image.alertmgrconf.repository`     | `alert manager configurer` image repository.                      | `nil`                     |
| `tgnms.stats.image.alertmgrconf.tag`            | `alert manager configurer` image tag.                             | `nil`                     |
| `tgnms.stats.configmap.alertmgr`                | Path of `alert manager` configuration file                        | `nil`                     |
| `tgnms.stats.configmap.promconf`                | Path of `prometheus` configuration file                           | `nil`                     |
| `tgnms.stats.service.type`                      | Kubernetes service type                                           | `ClusterIP`               |
| `tgnms.stats.service.annotations`               | Kubernetes annotations for stats                                  | `{}`                      |
| `tgnms.stats.service.labels`                    | Kubernetes labels for stats                                       | `{}`                      |
| `tgnms.stats.service.alertmgr.name`             | `alert manager` service name                                      | `alertmanager`            |
| `tgnms.stats.service.alertmgr.port`             | `alert manager` service exposed port                              | `9093`                    |
| `tgnms.stats.service.alertmgr.targetPort`       | `alert manager` service target port in container                  | `9093`                    |
| `tgnms.stats.service.alertmgrconf.name`         | `alert manager configurer` service name                           | `alertmanager-configurer` |
| `tgnms.stats.service.alertmgrconf.port`         | `alert manager configurer` service exposed port                   | `9101`                    |
| `tgnms.stats.service.alertmgrconf.targetPort`   | `alert manager configurer` service target port in container       | `9101`                    |
| `tgnms.stats.service.prom.name`                 | `prometheus` service name                                         | `prometheus`              |
| `tgnms.stats.service.prom.port`                 | `prometheus` service exposed port                                 | `9090`                    |
| `tgnms.stats.service.prom.targetPort`           | `prometheus` service target port in container                     | `9090`                    |
| `tgnms.stats.service.promconf.name`             | `prometheus configurer` service name                              | `prometheus configurer`   |
| `tgnms.stats.service.promconf.port`             | `prometheus configurer` service exposed port                      | `9100`                    |
| `tgnms.stats.service.promconf.targetPort`       | `prometheus configurer` service target port in container          | `9100`                    |
| `tgnms.stats.service.cache.name`                | `prometheus cache` service name                                   | `prometheus cache`        |
| `tgnms.stats.service.cache.port`                | `prometheus cache` service exposed port                           | `9091`                    |
| `tgnms.stats.service.cache.targetPort`          | `prometheus cache` service target port in container               | `9091`                    |
| `tgnms.stats.deployment.replicas`               | Pods number to assure running                                     | `1`                       |
| `tgnms.stats.deployment.strategy.type`          | Update `strategy` policy                                          | `Recreate`                |
| `tgnms.stats.deployment.livenessProbe.initWait` | Initial wait time in seconds                                      | `10`                      |
| `tgnms.stats.deployment.livenessProbe.period`   | Waiting period for next test                                      | `30`                      |
| `tgnms.stats.deployment.livenessProbe.promPath` | `prometheus` path to call                                         | `/graph`                  |
| `tgnms.stats.deployment.livenessProbe.rootPath` | `root` path to call                                               | `/graph`                  |
| `tgnms.stats.deployment.podAnnotations`         | Map of `annotations` to add to the pods                           | `{}`                      |
| `tgnms.stats.deployment.nodeSelector`           | Node labels for pod assignment                                    | `{}`                      |
| `tgnms.stats.deployment.tolerations`            | Pod taint `tolerations` for deployment                            | `{}`                      |
| `tgnms.stats.deployment.affinity`               | `Affinity` rules for pod assignment                               | `{}`                      |
| `tgnms.stats.deployment.resources`              | CPU/Memory `resource` requests/limits                             | `{}`                      |
| `tgnms.stats.deployment.podLabels`              | Map of `labels` to add to the pods                                | `{}`                      |
