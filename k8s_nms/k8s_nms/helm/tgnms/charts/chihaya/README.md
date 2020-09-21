### Terragraph Chihaya service helm chart
This is a chart for the `Terragraph Chihaya service`

### Prerequisites
- Kubernetes 1.10+ with Beta APIs enabled

### Installing the Chart
To install the chart with the release name `<release name>` in namespace `<namespace>`:
Replace `<release name>` and `<namespace>` with your values, the namespace should exist in the target cluster.
```bash
$ helm upgrade --install <release name> --namespace <namespace> ./tgnms/charts/chihaya -f vals.yml
``` 

### Uninstalling the Chart
To uninstall/delete the `ch` deployment from `tg` namespace:
```bash
$ helm delete ch --namespace tg
```
The command removes all the Kubernetes components associated with the `chihaya helm chart` and 
deletes the `ch release` completely from `tg` namespace.

### Configuration
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
