# Raspberry Pi 2 installation guide
We tested this procedure on:
- "Raspbian"
- "ubuntu-16.04-preinstalled-server"

Everything needs to be run as root!

## Install requirements

##### Install dependencies via apt-get
```
apt -y install unzip socat dsniff fuse libfuse-dev pkg-config python git ntpdate build-essential gdb
```

##### Install latest NodeJS 8.x release
Execute the following procedures only if are not already installed:

- NodeJS installation:
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install -y nodejs
node -v
```
- NPM installation:
```
npm install -g npm
npm config set python `which python2.7`
npm -v
```
- Check if the NODE_PATH variable is set:
```
echo $NODE_PATH
```

otherwise:
```
echo "NODE_PATH="`npm -g root` | tee -a /etc/environment
. /etc/environment > /dev/null
echo $NODE_PATH

reboot
```


## Install from NPM
```
npm install -g --unsafe @mdslab/wstun

npm install -g --unsafe @mdslab/iotronic-lightning-rod

reboot
```



## Install from source-code

##### Install required NodeJS modules via npm:
```
npm install -g --unsafe gyp autobahn@18.10.2 ws@6.1.0 nconf @mdslab/wstun fuse-bindings requestify is-running connection-tester log4js@1.1.1 q fs-access mknod jsonfile md5 python-shell net lsof
npm install -g --unsafe https://github.com/PlayNetwork/node-statvfs/tarball/v3.0.0
```

##### Install the Lightning-rod
```
mkdir -p /etc/iotronic/
mkdir -p /var/lib/iotronic/plugins
mkdir -p /var/lib/iotronic/drivers/mountpoints/
mkdir -p $NODE_PATH/@mdslab/

git clone --depth=1 git://github.com/MDSLab/s4t-lightning-rod.git $NODE_PATH/@mdslab/iotronic-lightning-rod

cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
sed -i "s|Environment=\"LIGHTNINGROD_HOME=\"|Environment=\"LIGHTNINGROD_HOME=$NODE_PATH/@mdslab/iotronic-lightning-rod\"|g" /etc/systemd/system/lightning-rod.service
chmod +x /etc/systemd/system/lightning-rod.service
systemctl daemon-reload

mkdir -p /var/log/iotronic/
mkdir -p /var/log/wstun/
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

echo "IOTRONIC_HOME=/var/lib/iotronic" | tee -a /etc/environment
echo "LIGHTNINGROD_HOME=$NODE_PATH/@mdslab/iotronic-lightning-rod" | tee -a /etc/environment
echo "NODE_TLS_REJECT_UNAUTHORIZED=0" | tee -a /etc/environment
source /etc/environment > /dev/null

cp $NODE_PATH/@mdslab/iotronic-lightning-rod/utils/templates/authentication.example /etc/iotronic/authentication.json
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/utils/templates/settings.example.json /var/lib/iotronic/settings.json
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/modules/plugins-manager/plugins.example.json /var/lib/iotronic/plugins/plugins.json
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/modules/drivers-manager/drivers.example.json /var/lib/iotronic/drivers/drivers.json

reboot
```


## Configure Lightning-rod
Now we have to choose which Lightning-rod modules enable. In the /var/lib/iotronic/settings.json configuration file there is the "modules" section:
```
"modules": {

        "plugins_manager": {
            "enabled": true,
            "boot": true,
            "alive_timer": 60
        },
        "services_manager": {
            "enabled": true,
            "boot": false
        },

        etc

}
```

In each module section (e.g. "plugins_manager", "services_manager", etc) to enable that module you have to set at "true" the "enabled" field.

At the end of the installation process we have to execute the LR configuration script:
```
$NODE_PATH/@mdslab/iotronic-lightning-rod/scripts/lr_configure
```
You can execute this script in interactive mode:
```
$ ./lr_configure -i
```

or in shell-mode passing the following parameters:
```
$ ./lr_configure <DEVICE_LAYOUT> <IOTRONIC_BOARD_ID> <IOTRONIC_BOARD_PASSWORD> <WAMP_URL> <WSTUN_URL>

* <DEVICE_LAYOUT>: 1 -> 'server', 2 -> 'arduino_yun', 3 -> 'raspberry_pi', 4 -> 'kitra'

* <IOTRONIC_BOARD_ID>: ID released by the registration process managed by IoTronic.

* <IOTRONIC_BOARD_PASSWORD>: password to log in to Iotronic

* <WAMP_URL>: Crossbar server URL

* <WSTUN_URL>: WSTUN server URL
```


## Start Lightning-rod
```
systemctl enable lightning-rod.service

systemctl start lightning-rod.service

tail -f /var/log/iotronic/lightning-rod.log
```

