#!/bin/bash
yum install -y centos-release-scl
yum install -y devtoolset-4-gcc*
scl enable devtoolset-4 bash
