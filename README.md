# Terragraph NMS
Just enough to show the very basics.

## Prerequisites
1. Recent-ish version of nodejs. 6.9.1 was used for development.
2. zeromq headers (zeromq-devel for CentOS)

## Install and Running
`git clone https://github.com/pmccut/tgnms.git`

Steps assume a recent CentOS distribution.

1. sudo yum install zeromq-devel
2. npm install
3. ./patch.sh
4. PORT=8090 npm start
5. Visit http://IP
