docker ps -a | awk '{print $NF}' | tail -n +2 | xargs docker rm -f
docker image ls -a | awk '{print $1}' | tail -n +2 | xargs docker image rm -f
docker volume ls | awk '{print $2}' | tail -n +2 | xargs docker volume rm
rm -rf terragraph
