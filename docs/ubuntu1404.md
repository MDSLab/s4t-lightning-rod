# IoTronic Lightning-rod installation guide for Ubuntu 14.04

We tested this procedure on a Ubuntu 14.04 (also within a LXD container). Everything needs to be run as root.

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

echo "NODE_PATH=/usr/lib/node_modules" | tee -a /etc/environment
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
npm install -g --unsafe gyp autobahn nconf @mdslab/wstun fuse-bindings requestify is-running connection-tester log4js@1.1.1 q fs-access mknod jsonfile md5 python-shell net
npm install -g --unsafe https://github.com/PlayNetwork/node-statvfs/tarball/v3.0.0
```


##### Install Lightning-rod
```
mkdir -p /var/lib/iotronic/plugins
mkdir -p /var/lib/iotronic/drivers/mountpoints/
mkdir -p $NODE_PATH/@mdslab/

git clone --depth=1 git://github.com/MDSLab/s4t-lightning-rod.git $NODE_PATH/@mdslab/iotronic-lightning-rod

cp /var/lib/iotronic/iotronic-lightning-rod/etc/init.d/s4t-lightning-rod_yun /etc/init.d/lightning-rod
sed -i "s/<LIGHTNINGROD_HOME>/export LIGHTNINGROD_HOME=\/var\/lib\/iotronic\/iotronic-lightning-rod/g" /etc/init.d/lightning-rod
chmod +x /etc/init.d/lightning-rod
chmod +x /var/lib/iotronic/iotronic-lightning-rod/lr-server.js

mkdir -p /var/log/iotronic/
touch /var/log/iotronic/lightning-rod.log
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

echo "IOTRONIC_HOME=/var/lib/iotronic/iotronic-lightning-rod" | tee -a /etc/environment
echo "LIGHTNINGROD_HOME=$IOTRONIC_HOME/lightning-rod" | tee -a /etc/environment
source /etc/environment > /dev/null

cp /var/lib/iotronic/iotronic-lightning-rod/settings.example.json /var/lib/iotronic/settings.json
cp /var/lib/iotronic/iotronic-lightning-rod/plugins.example.json /var/lib/iotronic/plugins/plugins.json
cp /var/lib/iotronic/iotronic-lightning-rod/drivers.example.json /var/lib/iotronic/drivers/drivers.json
```


## Configure Lightning-rod
At the end of the installation process we have to execute the LR configuration script:
```
$NODE_PATH/iotronic-lightning-rod/scripts/lr_configure.sh
```
This script asks the following information:
```
* device type: "server"

* Board ID: UUID released by the registration process managed by IoTronic.

* IoTronic server IP

* WAMP server IP
```


##### Configure logrotate
nano /etc/logrotate.d/lightning-rod.log
```
/var/log/iotronic/lightning-rod.log {
    weekly
    rotate = 3
    compress
    su root root
    maxsize 5M
}
```

## Start Lightning-rod
```
/etc/init.d/lightning-rod start

tail -f /var/log/iotronic/lightning-rod.log
```