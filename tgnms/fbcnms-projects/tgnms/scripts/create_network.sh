# Point to the internal API server hostname
APISERVER=https://kubernetes.default.svc

# Path to ServiceAccount token
SERVICEACCOUNT=/var/run/secrets/kubernetes.io/serviceaccount

# Read this Pod's namespace
NAMESPACE=$(cat ${SERVICEACCOUNT}/namespace)

# Read the ServiceAccount bearer token
TOKEN=$(cat ${SERVICEACCOUNT}/token)

# Reference the internal certificate authority (CA)
CACERT=${SERVICEACCOUNT}/ca.crt

# CREATE
curl --cacert ${CACERT} --header "Authorization: Bearer ${TOKEN}" -H 'Content-Type: application/json' -X POST -d "{\"apiVersion\": \"terragraph.com/v1\", \"kind\": \"Controller\", \"metadata\": {\"name\": \"$1\"}}" ${APISERVER}/apis/terragraph.com/v1/namespaces/default/controllers