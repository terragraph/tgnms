docker ps -a | awk '{print $NF}' | tail +2 | xargs docker rm -f
docker image ls -a | awk '{print $1}' | tail +2 | xargs docker image rm -f
docker volume ls | awk '{print $2}' | tail +2 | xargs docker volume rm
