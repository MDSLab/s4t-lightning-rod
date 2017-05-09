# Arduino YUN/Linino ONE installation guide


## Install requirements

#### Configure npm NODE_PATH variable

```
echo "export NODE_PATH=/usr/lib/node_modules" | tee -a
source /etc/profile > /dev/null
echo $NODE_PATH
```

##### Install dependencies via opkg

```
opkg update
opkg install logrotate nano git unzip socat ip dsniff fuse-utils node-autobahn node-jsonfile node-nconf node-reverse-wstunnel node-tty.js node-ideino-linino-lib node-fuse-bindings node-mknod node-statvfs
```

## Install from NPM
```
npm install -g --skip-installed --unsafe iotronic-lightning-rod
```
If you get some problems during npm dependencies installation phase we suggest you to follow the "Install from source-code" procedure.

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

##### Install required NodeJS modules via npm

```
npm install -g requestify is-running connection-tester log4js q fs-access util
```

##### Install the Lightning-rod

```
mkdir /var/lib/iotronic/ && cd /var/lib/iotronic/
git clone git://github.com/MDSLab/s4t-lightning-rod.git
mv s4t-lightning-rod iotronic-lightning-rod
mkdir plugins && mkdir drivers

cp /var/lib/iotronic/iotronic-lightning-rod/etc/init.d/s4t-lightning-rod_yun /etc/init.d/lightning-rod
sed -i "s/<LIGHTNINGROD_HOME>/export LIGHTNINGROD_HOME=\/var\/lib\/iotronic\/iotronic-lightning-rod/g" /etc/init.d/lightning-rod
chmod +x /etc/init.d/lightning-rod

mkdir /var/log/iotronic/
touch /var/log/iotronic/lightning-rod.log

echo "export IOTRONIC_HOME=/var/lib/iotronic" >> /etc/profile
echo "export LIGHTNINGROD_HOME=/var/lib/iotronic/iotronic-lightning-rod" >> /etc/profile
source /etc/profile
```

##### Configure Lightning-rod
Note that you need the NODE_ID that is the code returned by the IoTronic service after node registration.

```
cp /var/lib/iotronic/iotronic-lightning-rod/settings.example.json /var/lib/iotronic/iotronic-lightning-rod/settings.json
cp /var/lib/iotronic/iotronic-lightning-rod/modules/plugins-manager/plugins.example.json /var/lib/iotronic/iotronic-lightning-rod/plugins/plugins.json
cp /var/lib/iotronic/iotronic-lightning-rod/modules/drivers-manager/drivers.example.json /var/lib/iotronic/iotronic-lightning-rod/drivers/drivers.json

sed -i "s/\"device\":.*\"\"/\"device\": \"arduino_yun\"/g" /var/lib/iotronic/iotronic-lightning-rod/settings.json
sed -i "s/\"code\":.*\"\"/\"code\": \"<NODE_ID>\"/g" /var/lib/iotronic/iotronic-lightning-rod/settings.json
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/lib\/node_modules\/node-reverse-wstunnel\/bin\/wstt.js\"/g" /var/lib/iotronic/iotronic-lightning-rod/settings.json
sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /var/lib/iotronic/iotronic-lightning-rod/settings.json
sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /var/lib/iotronic/iotronic-lightning-rod/settings.json
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

##### Configure cron to launch the Lightning-rod if not yet running

```
/etc/init.d/cron stop
cp /var/lib/iotronic/iotronic-lightning-rod/etc/cron.d/root_yun /etc/crontabs/root
/etc/init.d/cron start
```

##### Start Lightning-rod and configure it to start at boot

```
/etc/init.d/lightning-rod enable
/etc/init.d/lightning-rod start

tail -f /var/log/iotronic/lightning-rod.log
```


