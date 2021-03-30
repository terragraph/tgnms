This directory is used to hold binaries and third party code for Terragraph projects

# Python Dependencies

Use this script to update the list of dependencies so `pip` works offline

```bash
cd connectivity-lab/terragraph/nms/third-party/wheels
python ../list_all_dependencies.py --dir ../../terragraph/ | xargs -L 1 pip download
```
