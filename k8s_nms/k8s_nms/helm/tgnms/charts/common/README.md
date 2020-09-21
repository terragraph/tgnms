### Common component chart
This is a chart for the `Terragraph common component`

### Prerequisites
- Kubernetes 1.10+ with Beta APIs enabled

### Installing the Chart
To install the chart with the release name `<release name>` in namespace `<namespace>`:
Replace `<release name>` and `<namespace>` with your values, the namespace should exist in the target cluster.
```bash
$ helm upgrade --install <release name> --namespace <namespace> ./tgnms/charts/common -f vals.yml
``` 

### Uninstalling the Chart
To uninstall/delete the `cm` deployment from `tg` namespace:
```bash
$ helm delete cm --namespace tg
```
The command removes all the Kubernetes components associated with the `common helm chart` and 
deletes the `cm release` completely from `tg` namespace.

### Configuration
The following table lists the configurable parameters of the `Common` helm chart and their default values.

| Parameter                                    | Description                                                         | Default                                   |
| -------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `imagePullSecrets`                           | Hold names of `Docker registry` k8s manifest secrets                | `[]`                                      |
| `commonCreate`                               | Frag if true installs `common chart`, otherwise it's not installed  | `false`                                   |
| `tgnms.common.timeZonePath`                   | `Time zone` used.                                                   | `/usr/share/zoneinfo/America/Los_Angeles` |
