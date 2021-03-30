# Terragraph Software

[Terragraph](https://terragraph.com/) is a 60GHz, multi-node wireless Software Defined Network (SDN) that enables high-speed internet connectivity in multiple environments. It incorporates commercial, off-the-shelf components and industrial design for quick and affordable deployments across many markets. The network operates best in Line-Of-Sight (LOS) conditions to maximize connectivity. In its essence, Terragraph is “wireless fiber” with gigabit speeds, rapid deployment capability, and flexible use case support.

This repo contains code for the Terragraph Network Management System (TGNMS).

## Installation

TGNMS is deployed via Ansible scripts run by an installer tool.

```bash
git clone https://github.com/facebookexternal/terragraph-apps.git
cd terragraph-apps/nms_stack
python -m pip install .

# Verify the installer tool was installed correctly
nms install --help

# Print default config, adjust as necessary
nms show-defaults > config.yml

# Run the installer tool
nms install -f config.yml -k <ssl-key-file> -C <ssl-cert-file> -h <host 1> -h <host 2> -h <host N>
```

## License

TGNMS has an MIT-style license as can be seen in the [LICENSE](LICENSE) file.
