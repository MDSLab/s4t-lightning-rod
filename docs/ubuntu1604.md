# IoTronic Lightning-rod installation guide for Ubuntu 16.04

We tested this procedure on a Ubuntu 16.04 (also within a LXD container). Everything needs to be run as root.


## Install requirements

##### Install dependencies via apt-get
```
apt -y install unzip socat dsniff fuse libfuse-dev pkg-config python
```
##### Install latest NodeJS release
```
curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
apt-get install -y nodejs
node -v

npm install -g npm
npm config set python `which python2.7`
npm -v
```
##### Configure npm NODE_PATH variable
```
echo "NODE_PATH=/usr/lib/node_modules" | tee -a /etc/environment
source /etc/environment > /dev/null
echo $NODE_PATH
```


## Install from NPM
```
npm install -g --skip-installed --unsafe iotronic-lightning-rod
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



## Install from source-code

##### Install required NodeJS modules via npm:
```
npm install -g gyp autobahn jsonfile nconf node-reverse-wstunnel tty.js fuse-bindings requestify is-running connection-tester log4js q secure-keys fs-access mknod
npm install -g https://github.com/PlayNetwork/node-statvfs/tarball/v3.0.0
```

##### Install the Lightning-rod
```
mkdir /var/lib/iotronic && cd /var/lib/iotronic
wget https://github.com/MDSLab/s4t-lightning-rod/archive/master.zip --no-check-certificate
unzip master.zip  && rm -f master.zip
mv s4t-lightning-rod-master lightning-rod
mkdir plugins && mkdir drivers
cp /var/lib/iotronic/lightning-rod/settings.example.json /var/lib/iotronic/settings.json
cp /var/lib/iotronic/lightning-rod/modules/plugins-manager/plugins.example.json /var/lib/iotronic/plugins/plugins.json
cp /var/lib/iotronic/lightning-rod/modules/drivers-manager/drivers.example.json /var/lib/iotronic/drivers/drivers.json
cp /var/lib/iotronic/lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
chmod +x /etc/systemd/system/lightning-rod.service
systemctl daemon-reload
systemctl enable lightning-rod.service
touch /var/log/iotronic/lightning-rod.log

echo "IOTRONIC_HOME=/var/lib/iotronic" | tee -a /etc/environment
echo "LIGHTNINGROD_HOME=$IOTRONIC_HOME/lightning-rod" | tee -a /etc/environment
source /etc/environment > /dev/null

```

##### Configure Lightning-rod
Note that you will need the IP address of a working instance of a WAMP router (<WAMP_IP>), the IP address of a working instance of a Websocket reverse tunnel server (<WS_IP>), and the UUID of the node that you need to have previously registered on the IoTronic (<NODE_UUID>). Also, note that if while installing the IoTronic service, you configured a custom port and realm name for the WAMP router or a custom port for the Websocket reverse tunnel server, you will need to manually change the setting.json, accordingly. 
```
sed -i "s/\"device\":.*\"\"/\"device\": \"laptop\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"code\":.*\"\"/\"code\": \"<NODE_UUID>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/lib\/node_modules\/node-reverse-wstunnel\/bin\/wstt.js\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/<WAMP_IP>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/<WS_IP>\"/g" /var/lib/iotronic/settings.json
```


## Start Lightning-rod
```
systemctl start lightning-rod.service
```
