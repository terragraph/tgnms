pushd .
cd ..
docker build -t beringeisetup -f dev/Dockerfile.setup .
docker build -t beringeidev -f dev/Dockerfile.dev .
popd
