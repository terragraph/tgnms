#!/bin/sh

if [ "${WORKSPACE}" == "" ]
then
  echo "Need WORKSPACE set to the base temp directory"
  exit 68
fi

BASE_VENV="${WORKSPACE}/venv"
ANSIBLE_VERSION=2.7.11
OUTPUT_FILE="${WORKSPACE}/nms.pex"
SYMLINK="${WORKSPACE}/nms"

set -eE
trap cleanup 0 1 2 3 6

cleanup()
{
  # cleanup
  echo "Cleanup"
  rm -rf ${BASE_VENV}
  rm -f ${OUTPUT_FILE}
}

# clean any previous rev
echo "Clean older stuff"
rm -rf ${BASE_VENV}
rm -f ${OUTPUT_FILE}

# Install Test Deps
echo "Making venv"
python3 -m venv ${BASE_VENV}
${BASE_VENV}/bin/pip install --upgrade pip setuptools wheel
${BASE_VENV}/bin/pip install --no-cache-dir ansible==${ANSIBLE_VERSION} black pex requests

# Get a list of submodules
git_submodules="$(git submodule status . | awk '{print $2}')"

# Submodules Check
echo "Checking Submodules"
for gs in $git_submodules; do
    if [ -z "$(ls $gs)" ]; then
        echo "Submodule $gs in not initialized, Please update your submodules."
        echo "e.g. git submodule init && git submodule update"
	exit 1
    fi
done

# Black
echo "Black"
${BASE_VENV}/bin/black --check --exclude "$(echo $git_submodules .eggs ./build | sed 's/ /|/g')" .

# push versions to console for debugging
echo "Packages"
${BASE_VENV}/bin/pip freeze
${BASE_VENV}/bin/pex --version

# build nms dist
echo "build nms dist"
${BASE_VENV}/bin/python3 setup.py bdist_wheel

# build pex
echo "Build pex"
${BASE_VENV}/bin/pex --wheel --python=python3 -v --disable-cache -f dist -f . ansible==$ANSIBLE_VERSION -e nms_cli.nms -o ${OUTPUT_FILE} .

# pex sanity test
echo "pex sanity test"
ls -lah ${OUTPUT_FILE}
${OUTPUT_FILE} --version

NOW=$(date +"%m_%d_%y_%H_%M_%S")
DATED_FILE="/tmp/nms_${NOW}"
mv ${OUTPUT_FILE} ${DATED_FILE}
rm -f ${SYMLINK}
ln -s ${DATED_FILE} ${SYMLINK}
