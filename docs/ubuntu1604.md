# IoTronic Lightning-rod installation guide for Ubuntu 16.04

We tested this procedure on a Ubuntu 16.04 (also within a LXD container). Everything needs to be run as root.


## Install requirements

##### Install dependencies via apt-get
```
apt -y install unzip socat dsniff fuse libfuse-dev pkg-config python git ntpdate
```

##### Install latest NodeJS 8.x release
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install -y nodejs
node -v

npm install -g npm
npm config set python `which python2.7`
npm -v

echo "NODE_PATH=$NODE_PATH" | tee -a /etc/environment
source /etc/environment > /dev/null
echo $NODE_PATH
```


## Install from NPM
```
npm install -g --unsafe @mdslab/wstun
npm install -g --unsafe @mdslab/iotronic-lightning-rod
```



## Install from source-code

##### Install required NodeJS modules via npm:
```
npm install -g --unsafe gyp autobahn nconf @mdslab/wstun fuse-bindings requestify is-running connection-tester log4js@1.1.1 q fs-access mknod jsonfile
npm install -g --unsafe https://github.com/PlayNetwork/node-statvfs/tarball/v3.0.0
```

##### Install the Lightning-rod
```
mkdir -p /var/lib/iotronic/plugins
mkdir -p /var/lib/iotronic/drivers/mountpoints/
mkdir -p $NODE_PATH/@mdslab/

git clone --depth=1 git://github.com/MDSLab/s4t-lightning-rod.git $NODE_PATH/@mdslab/iotronic-lightning-rod

cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
sed -i "s/Environment=\"LIGHTNINGROD_HOME=\"/Environment=\"LIGHTNINGROD_HOME=\/usr\/lib\/node_modules\/@mdslab\/iotronic-lightning-rod\"/g" /etc/systemd/system/lightning-rod.service
chmod +x /etc/systemd/system/lightning-rod.service
systemctl daemon-reload

mkdir -p /var/log/iotronic/
touch /var/log/iotronic/lightning-rod.log
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

echo "IOTRONIC_HOME=/var/lib/iotronic" | tee -a /etc/environment
echo "LIGHTNINGROD_HOME=$NODE_PATH/@mdslab/iotronic-lightning-rod" | tee -a /etc/environment
source /etc/environment > /dev/null

cp $NODE_PATH/@mdslab/iotronic-lightning-rod/settings.example.json /var/lib/iotronic/settings.json
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/modules/plugins-manager/plugins.example.json /var/lib/iotronic/plugins/plugins.json
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/modules/drivers-manager/drivers.example.json /var/lib/iotronic/drivers/drivers.json
```


## Configure Lightning-rod
At the end of the installation process we have to execute the LR configuration script:
```
$NODE_PATH/@mdslab/iotronic-lightning-rod/scripts/lr_configure.sh
```
This script asks the following information:
```
* device type: "server"

* Board ID: UUID released by the registration process managed by IoTronic.

* IoTronic server IP

* WAMP server URL
```


## Start Lightning-rod
```
systemctl enable lightning-rod.service

systemctl start lightning-rod.service

tail -f /var/log/iotronic/lightning-rod.log
```
