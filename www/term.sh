#!/bin/bash
read ipAddr
bash -c "ssh -o UserKnownHostsFile=/dev/null -o PubkeyAuthentication=no -o StrictHostKeyChecking=no root@$ipAddr"
