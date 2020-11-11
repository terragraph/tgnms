#!/bin/bash

# Build Terragraph docs.
# This script must be run from the root meta-terragraph directory.

set -e

date
echo "BOX_DIR=${BOX_DIR}"

date
echo "===> Building TG documentation ..."

# create build-docs directory
build_docs_dir="build-docs"
rm -rf $build_docs_dir
mkdir $build_docs_dir  # don't need this, build_docs will create the directory

echo ">> Generating release notes..."
release_output_dir="docs/releases/"
rm -rf $release_output_dir
mkdir $release_output_dir
python3 docs/build/committers.py \
  -o "$release_output_dir" \
  --all-tags-since RELEASE_M30

echo ">> Building markdown documentation..."
./docs/build/build_docs.sh $build_docs_dir
rm -rf $release_output_dir

# no need to build apidoc, just copy the pre-built directory
# ./src/terragraph-api/build_apidoc.sh "${build_docs_dir}/apidoc"
echo ">> Copying apidoc directory..."
cp -r src/terragraph-api/apidoc ${build_docs_dir}/

# echo ">> Generating LDoc..."
# ./facebook/utils/lua/run_ldoc.sh ${build_docs_dir}/lua/

# echo ">> Running doxygen..."
# install_rpm() {
#   # shellcheck disable=SC1091
#   . /etc/os-release
#   if [ "${VERSION_ID}" = "7" ]; then
#     echo "Installing $1 (via yum)..."
#     sudo yum -y install "$1"
#   elif [ "${VERSION_ID}" = "8" ]; then
#     echo "Installing $1 (via dnf)..."
#     sudo dnf -y install "$1"
#   fi
# }
# if [ ! -x "$(command -v doxygen)" ]; then
#   install_rpm doxygen
# fi
# if [ ! -x "$(command -v dot)" ]; then
#   # doxygen optionally uses "dot" to generate graphs
#   install_rpm graphviz
# fi
# ( cd src/terragraph-e2e/e2e/ && doxygen )
# mv src/terragraph-e2e/e2e/html ${build_docs_dir}/e2e

echo ">> Creating default tglib index page..."
mkdir ${build_docs_dir}/tglib
echo "tglib module not included" > ${build_docs_dir}/tglib/index.html

echo ">> Creating default nms index page..."
mkdir ${build_docs_dir}/nms
echo "nms module not included" > ${build_docs_dir}/nms/index.html

echo ">> Creating index page..."
./docs/build/create_index.py \
  -o $build_docs_dir/index.html \
  -v "$(git describe)" \
  "E2E API" /docs/apidoc/ \
  "NMS Documentation" /docs/nms/ \
  "tglib Documentation" /docs/tglib/

date
echo "<=== Building TG documentation completed."
