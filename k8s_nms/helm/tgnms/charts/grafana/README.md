### Terragraph grafana service helm chart
This is a chart for the `Terragraph Grafana service`

### Prerequisites
- Kubernetes 1.10+ with Beta APIs enabled

### Installing the Chart
To install the chart with the release name `<release name>` in namespace `<namespace>`:
Replace `<release name>` and `<namespace>` with your values, the namespace should exist in the target cluster.
```bash
$ helm upgrade --install <release name> --namespace <namespace> ./tgnms/charts/grafana -f vals.yml
```

### Uninstalling the Chart
To uninstall/delete the `gf` deployment from `tg` namespace:
```bash
$ helm delete gf --namespace tg
```
The command removes all the Kubernetes components associated with the `grafana helm chart` and
deletes the `gf release` completely from `tg` namespace.

### Configuration
The following table lists the configurable parameters of the `grafana` helm chart and their default values.

| Parameter                                | Description                                                         | Default           |
| ---------------------------------------- | ------------------------------------------------------------------- | ----------------- |
| `imagePullSecrets`                       | Hold names of `Docker registry` k8s manifest secrets                | `[]`              |
| `grafanaCreate`                          | Frag if true installs `grafana chart`, otherwise it's not installed | `false`           |
| `tgnms.grafana.image.repository`          | `grafana` image repository.                                         | `grafana/grafana` |
| `tgnms.grafana.image.tag`                 | `grafana` image tag.                                                | `latest`          |
| `tgnms.grafana.image.pullPolicy`          | `grafana` image pull policy                                         | `Always`          |
| `tgnms.grafana.env.dbType`                | Database type                                                       | `mysql`           |
| `tgnms.grafana.env.usersTheme`            | Users them                                                          | `light`           |
| `tgnms.grafana.env.dataSourceName`        | Data source name                                                    | `MySQL`           |
| `tgnms.grafana.env.orgId`                 | Organization identifier                                             | `Editor`          |
| `tgnms.grafana.env.usersOrgRole`          | Users organization role                                             | `1`               |
| `tgnms.grafana.env.gfMysqlDbUrl`          | Database `hostname:portnumber`                                      | `localhost:3306`  |
| `tgnms.grafana.env.gfMysqlDbName`         | Database name                                                       | `nil`             |
| `tgnms.grafana.env.gfAdminPass`           | `Grafana` administrator user password                               | `nil`             |
| `tgnms.grafana.env.gfMysqlReader`         | Database reader username                                            | `nil`             |
| `tgnms.grafana.env.gfMysqlReaderPass`     | Database reader password                                            | `nil`             |
| `tgnms.grafana.env.gfMysqlWriter`         | Database writer username                                            | `nil`             |
| `tgnms.grafana.env.gfMysqlWriterPass`     | Database writer password                                            | `nil`             |
| `tgnms.grafana.configmap.dashboards`      | Path of `Grafana dashboard` configuration file                      | `nil`             |
| `tgnms.grafana.configmap.mysqlds`         | Path of `MySQL datasource` configuration file                       | `nil`             |
| `tgnms.grafana.configmap.promds`          | Path of `Prometheus datasource` configuration file                  | `nil`             |
| `tgnms.grafana.configmap.linker`          | Path of `Link prometheus dashboard` configuration file              | `nil`             |
| `tgnms.grafana.configmap.network`         | Path of `Network health dashboard` configuration file               | `nil`             |
| `tgnms.grafana.configmap.udppinger`       | Path of `UDP pinger dashboard` configuration file                   | `nil`             |
| `tgnms.grafana.service.name`              | Kubernetes service name                                             | `grafana`         |
| `tgnms.grafana.service.annotations`       | Kubernetes annotations for grafana                                  | `{}`              |
| `tgnms.grafana.service.labels`            | Kubernetes labels for grafana                                       | `{}`              |
| `tgnms.grafana.service.type`              | Kubernetes service type                                             | `ClusterIP`       |
| `tgnms.grafana.service.port`              | Kubernetes service exposed port                                     | `3000`            |
| `tgnms.grafana.service.targetPort`        | Kubernetes service target port in container                         | `3000`            |
| `tgnms.grafana.deployment.replicas`       | Pods number to assure running                                       | `1`               |
| `tgnms.grafana.deployment.strategy.type`  | Update `strategy` policy                                            | `Recreate`        |
| `tgnms.grafana.deployment.configSubPath`  | Sub path of `grafana` configuration file in running container       | `grafana.yml`     |
| `tgnms.grafana.deployment.podAnnotations` | Map of `annotations` to add to the pods                             | `{}`              |
| `tgnms.grafana.deployment.nodeSelector`   | Node labels for pod assignment                                      | `{}`              |
| `tgnms.grafana.deployment.tolerations`    | Pod taint `tolerations` for deployment                              | `{}`              |
| `tgnms.grafana.deployment.affinity`       | `Affinity` rules for pod assignment                                 | `{}`              |
| `tgnms.grafana.deployment.resources`      | CPU/Memory `resource` requests/limits                               | `{}`              |
| `tgnms.grafana.deployment.podLabels`      | Map of `labels` to add to the pods                                  | `{}`              |
