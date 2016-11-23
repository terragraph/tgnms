# Terragraph NMS
Just enough to show the very basics.

## Prerequisites
1. Recent-ish version of nodejs. 6.9.1 was used for development.
2. zeromq headers (zeromq-devel for CentOS)

## Compile cpp2 thrift bindings
`python -mthrift_compiler.main --gen cpp2: Topology.thrift -o ~/nms/thrift/`

1. npm install
2. PORT=8090 npm start
3. Visit http://IP

## Install and Running
`git clone https://github.com/pmccut/tgnms.git`

Steps assume a recent CentOS distribution.

1. sudo yum install zeromq-devel
2. npm install
3. PORT=8090 npm start
4. Visit http://IP
