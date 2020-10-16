#!/bin/bash

echo "This script is for installing the Terragraph controller suite on a server via ansible. The box should be updated to latest"
echo
echo "Set TARGET_BOX to the target box and TARGET_USER to set the user. The default box is localhost and the default user us ubuntu."
echo "The user must be a user that can connect to the target box over ssh and passwordlessly sudo to root.  An ssh key is required here, ssh key forwarding works."
echo
echo "It attempts to create a local python virtualenv for ansible, builds an inventory file and tests to make sure that the user can connect."
echo "python is required on both ends and the virtualenv module is require locally. python2 requires 2.6+ and python3 requires 3.5+"
echo
echo "If your pythons are not named 'python3', add it to the environment variables TG_LOCAL_PYTHON and TG_REMOTE_PYTHON. Full paths are acceptable as well."
echo "The pip package is assumed to be python3-pip. If yours is different (centos, redhat on py2 is python2-pip for example), set PIP_PACKAGE"
echo

LPY=${TG_LOCAL_PYTHON:-python3}
RPY=${TG_REMOTE_PYTHON:-python3}
PP=${PIP_PACKAGE:-python3-pip}
box=${TARGET_BOX:-localhost}
user=${TARGET_USER:-ubuntu}


read -n 1 -p "Hit ^C to exit or anything else to continue"
echo

$LPY --version >/dev/null 2>&1
if [[ $? != 0 ]]; then
  echo "local python not found"
  exit
fi

echo "User: $user"
echo

echo "Box: $box"
echo

ssh -q -o StrictHostKeyChecking=no $user@$box 'uname >/dev/null 2>&1' >/dev/null 2>&1
if [[ $? != 0 ]]; then
  echo "ssh access failed"
  exit
fi

ssh -q $user@$box 'sudo -n uname >/dev/null 2>&1' >/dev/null 2>&1
if [[ $? != 0 ]]; then
  echo "sudo access failed"
  exit
fi

ssh -q $user@$box "sudo -n $RPY --version >/dev/null 2>&1" >/dev/null 2>&1
if [[ $? != 0 ]]; then
  echo "target box cannot launch python as root, please install this"
  exit
fi

echo "Connectivity good to go"
mkdir -p /tmp/tgtmp
INV=$(mktemp /tmp/tgtmp/tmp.XXXXXX)
echo '[nms]' >> $INV
echo "$box ansible_user=$user ansible_python_interpreter=$RPY" >> $INV

$LPY -m venv >/dev/null 2>&1
if [[ $? == 1 ]]; then
  echo "python virtualenv module not installed locally, please install (ex: apt-get install python3-venv)"
  exit
fi

echo "Ansible good to go"
echo

$LPY -m venv terragraph-venv
source terragraph-venv/bin/activate
pip install ansible
ansible-galaxy install zaxos.docker-ce-ansible-role

ansible-playbook -v -i $INV ./ansible-tg-single.yml -e docker_user=$user -e pip_package=$PP
deactivate
rm -rf /tmp/tgtmp
rm -rf terragraph-venv

