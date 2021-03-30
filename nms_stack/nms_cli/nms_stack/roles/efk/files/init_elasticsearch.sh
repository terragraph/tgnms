#!/usr/bin/env sh
# Copyright (c) 2014-present, Facebook, Inc.

function errorCheck() {
  ret=$?
  if [ ${ret} -ne 0 ]; then
    echo >&2 $1
    exit ${ret}
  fi
}

host="elasticsearch"

# Remove any configured properties since we know the elasticsearch instance is
# within the swarm
unset https_proxy
unset HTTPS_PROXY
unset http_proxy
unset HTTP_PROXY

# 1. check if elasticsearch cluster is up
if health="$(curl -fsSL "http://${host}:9200/_cat/health?h=status")"; then
  health="$(echo "${health}" | tr -d '[:space:]')" # trim whitespace (otherwise we'll have "green ")
  if [ "${health}" != "green" ]; then
    echo >&2 "unexpected health status: ${health}"
    exit 1
  fi
fi

# Create ilm policies
curl -fsSL -X PUT "http://${host}:9200/_ilm/policy/5d_prune_policy?pretty" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "delete": {
        "min_age": "5d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
'
errorCheck "Error creating 5 day ILM policy"

curl -fsSL -X PUT "http://${host}:9200/_ilm/policy/30d_prune_policy?pretty" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
'
errorCheck "Error creating 30 day ILM policy"

# Create index templates
curl -fsSL -X PUT "http://${host}:9200/_template/fluentd_base_template?pretty" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["fluentd-*"],
  "order": 0,
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1,
    "index.lifecycle.name": "30d_prune_policy",
    "index.translog.durability": "async"
  }
}
'
errorCheck "Error creating fluentd base index template"

curl -fsSL -X PUT "http://${host}:9200/_template/fluentd_log_template?pretty" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["fluentd-log-*"],
  "order": 1,
  "settings": {
    "index.lifecycle.name": "5d_prune_policy"
  },
  "mappings": {
    "properties": {
      "@log_name": {
        "type": "text",
        "norms": false
      },
      "log": {
        "type": "text",
        "norms": false
      },
      "mac_addr": {
        "type": "text",
        "norms": false
      },
      "node_name": {
        "type": "text",
        "norms": false
      },
      "topology_name": {
        "type": "text",
        "norms": false
      },
      "log_file": {
        "type": "text",
        "norms": false
      },
      "container_id": {
        "type": "text",
        "norms": false
      },
      "container_name": {
        "type": "text",
        "norms": false
      },
      "es_index": {
        "type": "text",
        "norms": false
      },
      "docker_service_name": {
        "type": "text",
        "norms": false
      }
    }
  }
}
'
errorCheck "Error creating fluentd log index template"

curl -fsSL -X PUT "http://${host}:9200/_template/fluentd_event_template?pretty" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["fluentd-event-*"],
  "order": 1,
  "mappings": {
    "properties": {
      "source": {
        "type": "text",
        "norms": false
      },
      "@timestamp": {
        "type": "date",
        "format": "epoch_second"
      },
      "reason": {
        "type": "text",
        "norms": false
      },
      "details": {
        "type": "text",
        "norms": false
      },
      "category": {
        "type": "integer"
      },
      "level": {
        "type": "integer"
      },
      "entity": {
        "type": "text",
        "norms": false
      },
      "node_id": {
        "type": "text",
        "norms": false
      },
      "event_id": {
        "type": "integer"
      },
      "topology_name": {
        "type": "text",
        "norms": false
      },
      "node_name": {
        "type": "text",
        "norms": false
      }
    }
  }
}
'
errorCheck "Error creating fluentd event index template"

exit 0
