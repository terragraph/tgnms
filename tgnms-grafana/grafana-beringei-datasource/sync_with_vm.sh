#rsync -azP --exclude '.git' --exclude 'node_modules' . root@[2620:10d:c089:e001:4798:5cb6:1dc4:14de]:/home/nms/terragraph-apps/beringei/grafana-beringei-datasource
rsync -azP --exclude '.git' --exclude 'node_modules' . root@[2620:10d:c089:e001:250:56ff:fea8:76a0]:/var/lib/grafana/plugins/grafana-beringei-datasource

# this command points mysql to the prod server
# ssh root@2620:10d:c089:e001:4798:5cb6:1dc4:14de /home/nms/www/pointToProdMysql.sh
#ssh root@2620:10d:c089:e001:4798:5cb6:1dc4:14de systemctl restart nms_prod


