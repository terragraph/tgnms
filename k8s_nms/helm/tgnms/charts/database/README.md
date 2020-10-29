### Terragraph Database service helm chart
This is a chart for the `Terragraph Database service`

### Prerequisites
- Kubernetes 1.10+ with Beta APIs enabled
- PV provisioner support in the underlying infrastructure

### Installing the Chart
To install the chart with the release name `<release name>` in namespace `<namespace>`:
Replace `<release name>` and `<namespace>` with your values, the namespace should exist in the target cluster.
```bash
$ helm upgrade --install <release name> --namespace <namespace> ./tgnms/charts/database -f vals.yml
```

### Uninstalling the Chart
To uninstall/delete the `db` deployment from `tg` namespace:
```bash
$ helm delete db --namespace tg
```

The command removes all the Kubernetes components associated with the `database helm chart` and
deletes the `db release` completely from `tg` namespace.

### Configuration
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
