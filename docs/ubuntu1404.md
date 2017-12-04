# IoTronic Lightning-rod installation guide for Ubuntu 14.04

We tested this procedure on a Ubuntu 14.04 (also within a LXD container). Everything needs to be run as root.

## Install requirements
##### Install dependencies via apt-get
```
apt -y install nodejs npm nodejs-legacy unzip socat dsniff fuse libfuse-dev pkg-config
```

##### Install required NodeJS modules via npm
```
npm install -g npm
npm install -g gyp autobahn jsonfile nconf @mdslab/wstun tty.js fuse-bindings requestify is-running connection-tester log4js q secure-keys fs-access mknod optimist
```

##### Configure npm NODE_PATH variable
```
echo "NODE_PATH=/usr/local/lib/node_modules" | sudo tee -a /etc/environment
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

##### Install Lightning-rod
```
mkdir /var/lib/iotronic/ && cd /var/lib/iotronic/
git clone git://github.com/MDSLab/s4t-lightning-rod.git
mv s4t-lightning-rod iotronic-lightning-rod
mkdir plugins && mkdir drivers

cp /var/lib/iotronic/iotronic-lightning-rod/etc/init.d/s4t-lightning-rod_yun /etc/init.d/lightning-rod
sed -i "s/<LIGHTNINGROD_HOME>/export LIGHTNINGROD_HOME=\/var\/lib\/iotronic\/iotronic-lightning-rod/g" /etc/init.d/lightning-rod
chmod +x /etc/init.d/lightning-rod
chmod +x /var/lib/iotronic/iotronic-lightning-rod/lr-server.js

touch /var/log/iotronic/lightning-rod.log

echo "IOTRONIC_HOME=/var/lib/iotronic/iotronic-lightning-rod" | tee -a /etc/environment
echo "LIGHTNINGROD_HOME=$IOTRONIC_HOME/lightning-rod" | tee -a /etc/environment
source /etc/environment > /dev/null
```

##### Configure Lightning-rod
Note that you will need the IP address of a working instance of a WAMP router (<WAMP_IP>), the IP address of a working instance of a Websocket reverse tunnel server (<WS_IP>), and the UUID of the node that you need to have previously registered on the IoTronic (<NODE_UUID>). Also, note that if while installing the IoTronic service, you configured a custom port and realm name for the WAMP router or a custom port for the Websocket reverse tunnel server, you will need to manually change the setting.json, accordingly. 
```
cp /var/lib/iotronic/iotronic-lightning-rod/settings.example.json /var/lib/iotronic/settings.json
cp /var/lib/iotronic/iotronic-lightning-rod/plugins.example.json /var/lib/iotronic/plugins/plugins.json
cp /var/lib/iotronic/iotronic-lightning-rod/drivers.example.json /var/lib/iotronic/drivers/drivers.json

sed -i "s/\"device\":.*\"\"/\"device\": \"laptop\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"code\":.*\"\"/\"code\": \"<NODE_UUID>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/local\/lib\/node_modules\/@mdslab\/wstun\/bin\/wstun.js\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/<WAMP_IP>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/<WS_IP>\"/g" /var/lib/iotronic/settings.json
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