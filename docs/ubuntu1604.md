# IoTronic Lightning-rod installation guide for Ubuntu 16.04

We tested this procedure on a Ubuntu 16.04 (also within a LXD container). Everything needs to be run as root.


## Install requirements

##### Install dependencies via apt-get
```
apt -y install unzip socat dsniff fuse libfuse-dev pkg-config python git ntpdate
```

##### Install latest NodeJS 7.x release
```
curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
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
npm install -g --unsafe @mdslab/iotronic-lightning-rod
npm install -g --unsafe @mdslab/wstun
```

##### Configure Lightning-rod
At the end of the installation process we have to execute the LR configuration script:
```
$NODE_PATH/iotronic-lightning-rod/scripts/lr_configure.sh
```
This script asks the following information:
```
* device type: [ "arduino_yun" | "server" | "raspberry_pi"]

* Board ID: UUID released by the registration process managed by IoTronic.

* IoTronic server IP

* WAMP server IP
```
Add ENV variables
```
echo "IOTRONIC_HOME=/var/lib/iotronic" | tee -a /etc/environment
echo "LIGHTNINGROD_HOME=/usr/lib/node_modules/iotronic-lightning-rod" | tee -a /etc/environment

source /etc/environment > /dev/null
```


## Install from source-code

##### Install required NodeJS modules via npm:
```
npm install -g --unsafe gyp autobahn nconf @mdslab/wstun fuse-bindings requestify is-running connection-tester log4js@1.1.1 q fs-access mknod jsonfile
npm install -g --unsafe https://github.com/PlayNetwork/node-statvfs/tarball/v3.0.0
```

##### Install the Lightning-rod
```
mkdir /var/lib/iotronic/ && cd /var/lib/iotronic/
mkdir plugins && mkdir drivers
mkdir drivers/mountpoints/

cd /usr/lib/node_modules/
git clone git://github.com/MDSLab/s4t-lightning-rod.git
mv s4t-lightning-rod iotronic-lightning-rod

cp /usr/lib/node_modules/iotronic-lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
sed -i "s/Environment=\"LIGHTNINGROD_HOME=\"/Environment=\"LIGHTNINGROD_HOME=\/usr\/lib\/node_modules\/iotronic-lightning-rod\"/g" /etc/systemd/system/lightning-rod.service
chmod +x /etc/systemd/system/lightning-rod.service
systemctl daemon-reload

mkdir /var/log/iotronic/
touch /var/log/iotronic/lightning-rod.log

echo "IOTRONIC_HOME=/var/lib/iotronic" | tee -a /etc/environment
echo "LIGHTNINGROD_HOME=/usr/lib/node_modules/iotronic-lightning-rod" | tee -a /etc/environment
source /etc/environment > /dev/null

```

##### Configure Lightning-rod
Note that you will need the IP address of a working instance of a WAMP router (<WAMP_IP>), the IP address of a working instance of a Websocket reverse tunnel server (<WS_IP>), and the UUID of the node that you need to have previously registered on the IoTronic (<NODE_UUID>). Also, note that if while installing the IoTronic service, you configured a custom port and realm name for the WAMP router or a custom port for the Websocket reverse tunnel server, you will need to manually change the setting.json, accordingly. 
```
cp /usr/lib/node_modules/iotronic-lightning-rod/settings.example.json /var/lib/iotronic/settings.json
cp /usr/lib/node_modules/iotronic-lightning-rod/modules/plugins-manager/plugins.example.json /var/lib/iotronic/plugins/plugins.json
cp /usr/lib/node_modules/iotronic-lightning-rod/modules/drivers-manager/drivers.example.json /var/lib/iotronic/drivers/drivers.json

sed -i "s/\"device\":.*\"\"/\"device\": \"server\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"code\":.*\"\"/\"code\": \"<NODE_UUID>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/lib\/node_modules\/@mdslab\/wstun\/bin\/wstun.js\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/<WAMP_IP>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/<WS_IP>\"/g" /var/lib/iotronic/settings.json
```

## Configure logrotate
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
systemctl enable lightning-rod.service

systemctl start lightning-rod.service

tail -f /var/log/iotronic/lightning-rod.log
```
