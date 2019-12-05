# Pull base image
FROM ubuntu:18.04

# Install dependencies, build fbthrift, and clean up
RUN buildDeps=" \
                bison \
                build-essential \
                cmake \
                flex \
                git \
                libboost-all-dev \
                libdouble-conversion-dev \
                libevent-dev \
                libgflags-dev \
                libgoogle-glog-dev \
                libsodium-dev \
                libssl-dev \
                python-six \
                zlib1g-dev \
          "; \
          apt update && apt install -y $buildDeps && \
          # Install python3.7
          apt-get install -y python3.7 python3-pip python3.7-dev && \
          cd /usr/local/bin && \
          ln -s /usr/bin/python3.7 python && \
          python -m pip install --upgrade pip setuptools && \
          # Install fmt
          cd /opt && \
          git clone https://github.com/fmtlib/fmt.git && \
          cd fmt && \
          mkdir _build && \
          cd _build && \
          cmake .. && \
          make -j $(nproc) && \
          make install && \
          # Install folly
          cd /opt && \
          git clone https://github.com/facebook/folly.git && \
          cd folly && \
          mkdir _build && \
          cd _build && \
          cmake .. && \
          make -j $(nproc) && \
          make install && \
          # Install fizz
          cd /opt && \
          git clone https://github.com/facebookincubator/fizz && \
          cd fizz && \
          mkdir _build && \
          cd _build && \
          cmake ../fizz && \
          make -j $(nproc) && \
          make install && \
          # Install wangle
          cd /opt && \
          git clone https://github.com/facebook/wangle.git && \
          cd wangle/wangle && \
          mkdir _build && \
          cd _build && \
          cmake .. && \
          make -j $(nproc) && \
          make install && \
          # Install zstd
          cd /opt && \
          git clone https://github.com/facebook/zstd.git && \
          cd zstd/build/cmake && \
          mkdir _build && \
          cd _build && \
          cmake .. && \
          make -j $(nproc) && \
          make install && \
          # Install rsocket-cpp
          cd /opt && \
          git clone https://github.com/rsocket/rsocket-cpp.git && \
          cd rsocket-cpp && \
          mkdir _build && \
          cd _build && \
          cmake .. && \
          make -j $(nproc) && \
          make install && \
          cd ../yarpl && \
          mkdir _build && \
          cd _build && \
          cmake .. -DBUILD_TESTS=OFF && \
          make -j $(nproc) && \
          make install && \
          # Install fbthrift
          cd /opt && \
          git clone https://github.com/facebook/fbthrift && \
          cd fbthrift/build && \
          cmake .. && \
          make -j $(nproc) && \
          make install && \
          ln -s /usr/local/bin/thrift1 /usr/local/bin/thrift && \
          pip install ../thrift/lib/py && \
          # Clean up dependencies
          rm -rf /opt/* && \
          apt purge -y --auto-remove $buildDeps

# Compile thrift files and install tglib
WORKDIR /usr/local/tglib
COPY tglib/ .flake8 ./
COPY if/ ./if
RUN apt install -y libboost-filesystem-dev
RUN python setup.py build_thrift && pip install .[ci,docs]

# Define default command
CMD ["/bin/bash"]
