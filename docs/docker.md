# Installation on Docker

Lightning-rod repositories:
 * [x86_64](https://hub.docker.com/r/mdslab/iotronic-lightning-rod/)
 * [Raspberry Pi 3 (ARMv7l)](https://hub.docker.com/r/mdslab/rpi-iotronic-lightning-rod/)


MDSLAB Docker Hub [webpage](https://hub.docker.com/r/mdslab/)

## Requirements

* Docker! Follow the official [guides](https://docs.docker.com/install/)

## Configure Lightning-rod environment

* Create a folder in your system to store Lightning-rod settings, </CONFIG/PATH/> (e.g. /etc/iotronic/):
```
sudo mkdir /etc/iotronic/
```

* Get Lightning-rod configuration template files;
```
cd /etc/iotronic/

sudo wget https://raw.githubusercontent.com/MDSLab/s4t-lightning-rod/master/utils/templates/settings.example.json -O settings.json
sudo wget https://raw.githubusercontent.com/MDSLab/s4t-lightning-rod/master/utils/templates/authentication.example -O authentication.json
```

* Edit settings.json
```
cd /tmp/

wget https://raw.githubusercontent.com/MDSLab/s4t-lightning-rod/master/utils/install/docker/configure_LR_docker.sh -O lr_configure

chmod +x lr_configure

./lr_configure <BOARD_ID> <BOARD_PASSWORD> <WAMP_URL> <WSTUN_URL> </CONFIG/PATH/>
```
This script asks the following information:
```
* Device ID: UUID released by the registration process managed by IoTronic.

* Device Iotronic password: password to log in to Iotronic

* WAMP url: ws://<IP> or wss://<IP>

* WSTUN url: ws://<IP> or wss://<IP>

* Configuration files path: e.g. /etc/iotronic/
```

## Get container

Create container editing the following commands so that </CONFIG/PATH/>
points at the folder that you created in the first step (e.g: /etc/iotronic/):

* for "x86_64":
```
docker run -d -v lr_data:/var/lib/iotronic -v </CONFIG/PATH/>/settings.json:/var/lib/iotronic/settings.json -v </CONFIG/PATH/>/authentication.json:/etc/iotronic/authentication.json --net=host --name=lightning-rod mdslab/iotronic-lightning-rod
```

* for "ARMv7l" on Raspberry Pi 3:
```
docker run -d -v lr_data:/var/lib/iotronic -v </CONFIG/PATH/>/settings.json:/var/lib/iotronic/settings.json -v </CONFIG/PATH/>/authentication.json:/etc/iotronic/authentication.json --net=host --name=lightning-rod mdslab/rpi-iotronic-lightning-rod
```
