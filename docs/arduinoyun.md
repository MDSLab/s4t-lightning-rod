#Arduino YUN/Linino ONE installation guide

####Install dependencies via opkg:

```
opkg update
opkg install unzip socat ip dsniff fuse-utils node-autobahn node-jsonfile node-nconf node-reverse-wstunnel node-tty.js node-ideino-linino-lib node-fuse-bindings node-mknod node-statvfs -d mnt
```

####Install necessary node.js modules via npm:

```
npm install -g requestify is-running connection-tester log4js q fs-access util
```


####Install the Lightning-rod:

```
mkdir /var/lib/iotronic && cd /var/lib/iotronic
wget https://github.com/MDSLab/s4t-lightning-rod/archive/api.zip --no-check-certificate
unzip api.zip && rm -f api.zip
mv s4t-lightning-rod-api lightning-rod
mkdir plugins && mkdir drivers
cp /var/lib/iotronic/lightning-rod/etc/init.d/s4t-lightning-rod_yun /etc/init.d/lightning-rod
chmod +x /etc/init.d/lightning-rod
touch /var/log/iotronic/lightning-rod.log
```

####Configure the Lightning-rod
(note that you need the NODE_ID that is the code returned by the IoTronic service after node registration):

```
cp /var/lib/iotronic/lightning-rod/settings.example.json /var/lib/iotronic/settings.json
cp /var/lib/iotronic/lightning-rod/modules/plugins-manager/plugins.example.json /var/lib/iotronic/plugins/plugins.json
cp /var/lib/iotronic/lightning-rod/modules/drivers-manager/drivers.example.json /var/lib/iotronic/drivers/drivers.json

sed -i "s/\"device\":.*\"\"/\"device\": \"arduino_yun\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"code\":.*\"\"/\"code\": \"<NODE_ID>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/opt\/usr\/lib\/node_modules\/node-reverse-wstunnel\/bin\/wstt.js\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /var/lib/iotronic/settings.json
```

####Start the Lightning-rod and configure it to start at boot:

```
/etc/init.d/lightning-rod enable
/etc/init.d/lightning-rod start
```

####Configure cron to launch the Lightning-rod if not yet running:

```
/etc/init.d/cron stop
cp /var/lib/iotronic/lightning-rod/etc/cron.d/root_yun /etc/crontabs/root
/etc/init.d/cron start
```
