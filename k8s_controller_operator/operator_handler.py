# https://www.opcito.com/blogs/implementing-kubernetes-operators-with-python
import kopf
import kubernetes
import yaml
import jinja2
from kubernetes import utils
from collections import namedtuple

from config import configure_templates


Controller = namedtuple(
    "Controller",
    ["scripts_configmap", "pv", "pvc", "env_configmap", "service", "deployment"],
)


def generate_controller(network_name: str) -> Controller:
    variables = {
        "controllers_list": [{"name": network_name, "bt_seeder_port": 6881}],
        "terragraph_hostpath": "/opt/terragraph",
        "API_ARGS": "",
        "E2E_CONFIG_FILE": "cfg/controller_config.json",
        "E2E_TOPOLOGY_FILE": "e2e_topology.conf",
        "NMS_CONFIG_FILE": "cfg/aggregator_config.json",
        "keycloak_enabled": True,
        "keycloak_image": "jboss/keycloak:7.0.0",
        "e2e_image": "secure.cxl-terragraph.com:443/e2e-controller:latest",
        "image_pull_policy": "Always",
        "namespace": "default",
    }

    string = configure_templates(
        variables, {"controller.yml": open("deployment.yml", "r").read()}
    )

    data = list(yaml.load_all(string, Loader=yaml.SafeLoader))

    return Controller(
        scripts_configmap=data[1],
        pv=data[2],
        pvc=data[3],
        env_configmap=data[4],
        service=data[5],
        deployment=data[6],
    )


@kopf.on.create("terragraph.com", "v1", "controllers")
def create_fn(body, **kwargs):
    namespace = body["metadata"]["namespace"]
    network_name = body["metadata"]["name"]

    # Create the controller using the manifest from the installer
    controller = generate_controller(network_name)

    # Adopt all the objects so they get deleted when the Controller CRD is deleted
    for name in controller._fields:
        kopf.adopt(getattr(controller, name), owner=body)

    # Object used to communicate with the API Server
    api = kubernetes.client.CoreV1Api()
    apps_api = kubernetes.client.AppsV1Api()

    # Create all the resources
    api.create_namespaced_config_map(namespace, body=controller.env_configmap)
    api.create_namespaced_config_map(namespace, body=controller.scripts_configmap)

    # PVs don't have a namespace
    api.create_persistent_volume(body=controller.pv)
    api.create_namespaced_persistent_volume_claim(namespace, body=controller.pvc)
    api.create_namespaced_service(namespace, body=controller.service)
    apps_api.create_namespaced_deployment(namespace, body=controller.deployment)

    msg = f"Made a network for {network_name}"
    return {"message": msg}


@kopf.on.delete("terragraph.com", "v1", "controllers")
def delete(body, **kwargs):
    network_name = body["metadata"]["name"]
    api = kubernetes.client.CoreV1Api()
    msg = "Deleted controller"
    pv_name = f"e2e-{network_name}"
    try:
        api.delete_persistent_volume(name=pv_name)
    except Exception as e:
        msg += f" (failed to delete volume: {pv_name})"
    return {"message": msg}

