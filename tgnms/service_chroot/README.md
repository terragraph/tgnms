# Running E2EController / NMSAggregator
Basic support for running e2e_controller and nms_aggregator is checked into service_chroot/
Activating is fairly straight-forward.

## Configuration
You must define the rootfs path for e2e_controller and nms_aggregator.
For CentOS this is defined in /etc/sysconfig/tg_services, Debian/Ubuntu uses /etc/default/tg_services.

```
E2E_ROOTFS="/root/rootfs"
NMS_ROOTFS="/root/rootfs"
NMS_ARGS="-v 2"
```

## Install    
```
for dir in ~nms/tgnms/service_chroot/*; do [ -d "$dir" ] && cp -v $dir/$(basename $dir).service /usr/lib/systemd/system/ && systemctl enable $(basename $dir).service; done
for dir in ~nms/tgnms/service_chroot/*; do [ -d "$dir" ] && systemctl start $(basename $dir).service; done
```

## Logging
```
journalctl -u e2e_controller -f
journalctl -u nms_aggregator -f
```
