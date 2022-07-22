#!/usr/bin/env python
# coding: utf-8

# # Using the E2E Controller API
# 
# This notebook shows a Python example of an external client that reads from / writes to a controller running on TGNMS. The full API docs can be found at [your-nms-ip/docs/](your-nms-ip/docs/). First check that you can reach the API. The example here uses a TGNMS instance located at `https://labnmsbeta.terragraph.link`, so you should change this to the IP address or hostname of your TGNMS instance.

# In[1]:


import requests
import json
import random
import urllib.parse

network_name = "F8 IF Rack"

base_url = "https://labnmsbeta.terragraph.link"
api_url = f"{base_url}/api/{urllib.parse.quote(network_name)}/"

# This returns an HTTP 401: Unauthorized since we haven't authenticated with Keycloak yet
response = requests.get(api_url + "api/v2/getTopology")
print(response)


# Go to your NMS's Keycloak page and add a client for your application. Visit [your-nms-ip/auth](your-nms-ip/auth) and log into Keycloak. The username is `root` and the password can be found either in your `config.yml` or on the machine running NMS at `/opt/terragraph/creds.yml` under `keycloak_root_password`.
# 
# ![Screen Shot 2021-03-18 at 7.31.14 PM.png](attachment:555e6b11-240c-47b8-a341-1f53ffc98eea.png)
# 
# You will be presented with this page at log in, click "Clients" on the sidebar then "Create" and add your client.
# 
# ![Screen Shot 2021-03-18 at 7.31.25 PM.png](attachment:9aa5e130-6885-4141-ad64-dcf19cee19c6.png)
# 
# Next change the "Access Type" of your client to "confidential", enable "Service Accounts", and add a redirect URL (this can be the IP or hostname of your NMS instance) then copy the secret from the "Credentials" tab. It will be something like `cf0c3940-283n-49a5-99f2-affd03de91eb`. Finally, make sure to enable the scopes needed for your application under "Service Account Roles" (for this demo `my-test-app` uses all available roles). Now we can `curl` for the token like so:
# 
# ```bash
# $ curl -L -d 'grant_type=client_credentials' -d 'client_id=my-test-app' -d 'client_secret=cf0c3940-283n-49a5-99f2-affd03de91eb' -H 'Content-Type: application/x-www-form-urlencoded' --noproxy '*' -X POST https://labnmsbeta.terragraph.link/auth/realms/tgnms/protocol/openid-connect/token
# {"access_token": "....", ...}
# ```
# 
# Now we will do this same thing in Python and use the `access_token` to request `getTopology`.

# In[2]:


# First, get the token
auth_url = f"{base_url}/auth/realms/tgnms/protocol/openid-connect/token"

# Change the client_id and client_secret to match your Keycloak client
data = {
    "grant_type": "client_credentials",
    "client_id": "my-test-app",
    "client_secret": "cf0c6281-4d2c-49a5-99f2-affd03de91eb",
}

# Make the request
response = requests.post(auth_url, data=data).json()
access_token = response["access_token"]
auth_header = {"Authorization": f"Bearer {access_token}"}

# Now make an authenticated request to the API and see the result
response = requests.get(api_url + "api/v2/getTopology", headers=auth_header)
print(response.content.decode()[:100] + "...")


# Now that we are connected to the TGNMS E2E controller API, it is possible to use any call listed in the API docs. Those can be found at [your-nms-ip/docs/apidoc/](your-nms-ip/docs/apidoc/). Next in this notebook we will add a network via the `bulkAdd` topology API. First we need to prepare the data using the helper functions below so that it will be accepted by the API.

# In[3]:


def make_site(name):
    base_latitude = 37.484596
    base_longitude = -122.148646
    37.484430, -122.147415
    return {
        "name": name,
        "location": {
            "latitude": base_latitude + random.random() / 1000,
            "longitude": base_longitude + random.random() / 1000,
            "altitude": 30,
            "accuracy": 40000000
        }
    }

def make_node(name, mac, site, is_pop):
    return {
        "name": name,
        "node_type": 2,
        "is_primary": True,
        "mac_addr": mac,
        "wlan_mac_addrs": [],
        "pop_node" : is_pop,
        "status": 1,
        "site_name": site["name"],
        "ant_azimuth": 100.0,
        "ant_elevation": 999.99
    }

def make_link(info):
    aName, aMac = info[0]
    zName, zMac = info[1]
    
    return {
        "name": f"link-{aName}-{zName}",
        "a_node_name": aName,
        "a_node_mac": aMac,
        "z_node_name": zName,
        "z_node_mac": zMac,
        "is_alive": False,
        "linkup_attempts": 0,
        "link_type": 1  # wireless link
    }

node_info = [
    ("pop-if6", "34:ef:b6:51:e5:a8"),
    ("if5", "34:ef:b6:51:e3:ec"),
    ("if4", "34:ef:b6:51:e4:1c"),
    ("if3", "34:ef:b6:51:e3:da"),
    ("if2", "34:ef:b6:51:e3:e0"),
    ("if1", "34:ef:b6:51:e3:3e"),
]

sites = []
nodes = []
links = []

for node_name, mac in node_info:
    site = make_site(f"site-{node_name}")
    sites.append(site)
    
    nodes.append(make_node(node_name, mac, site, "pop" in node_name))

link_info = [
    (("if1", "04:ce:14:fe:a5:d9"), ("pop-if6", "04:ce:14:fe:a5:a4")),
    (("if2", "04:ce:14:fe:a6:03"), ("if3", "04:ce:14:fe:a5:3f")),
    (("if2", "04:ce:14:fe:a5:e9"), ("if1", "04:ce:14:fe:a5:dc")),
    (("if3", "04:ce:14:fe:a5:40"), ("pop-if6", "04:ce:14:fe:a5:86")),
]

for info in link_info:
    links.append(make_link(info))


# Now that we have a list of the nodes, sites, and links we want to add we can send them off to the `api/bulkAdd` endpoint.

# In[4]:


data = {
    "sites": sites,
    "nodes": nodes,
    "links": links,
}
response = requests.post(api_url + "api/bulkAdd", json=data, headers=auth_header)
print(response)

