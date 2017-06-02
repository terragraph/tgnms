#!/bin/bash
git clone https://github.com/pmccut/beringei.git
pushd beringei
mkdir build && cd build && cmake .. && make
popd
