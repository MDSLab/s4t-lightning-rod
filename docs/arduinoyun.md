#Arduino YUN/Linino ONE installation guide

####Install dependencies via opkg:

```
# opkg update
# opkg install unzip socat ip dsniff fuse-utils node-autobahn node-jsonfile node-nconf node-reverse-wstunnel node-tty.js node-ideino-linino-lib node-fuse-bindings -d mnt
```

####Install necessary node.js modules via npm:

```
# npm install -g requestify is-running connection-tester log4js q
```

####Install the Lightning-rod:

```
# mkdir /opt/stack4things/ && cd /opt/stack4things/
# wget https://github.com/MDSLab/s4t-lightning-rod/archive/master.zip --no-check-certificate
# unzip master.zip && rm -f master.zip
# mv s4t-lightning-rod-master lightning-rod
# cd lightning-rod && mkdir plugins && mkdir plugin_conf && mkdir drivers
# cp /opt/stack4things/lightning-rod/etc/init.d/s4t-lightning-rod_yun /etc/init.d/s4t-lightning-rod
# chmod +x /etc/init.d/s4t-lightning-rod
# touch /var/log/s4t-lightning-rod.log
```

####Configure the Lightning-rod
(note that you need the NODE_ID that is the code returned by the IoTronic service after node registration):

```
# cp /opt/stack4things/lightning-rod/settings.example.json /opt/stack4things/lightning-rod/settings.json
# cp /opt/stack4things/lightning-rod/plugins.example.json /opt/stack4things/lightning-rod/plugins.json
# cp /opt/stack4things/lightning-rod/drivers.example.json /opt/stack4things/lightning-rod/drivers.json
# sed -i "s/\"device\":.*\"\"/\"device\": \"arduino_yun\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"code\":.*\"\"/\"code\": \"<NODE_ID>\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/opt\/usr\/lib\/node_modules\/node-reverse-wstunnel\/bin\/wstt.js\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /opt/stack4things/lightning-rod/settings.json
```

####Start the Lightning-rod and configure it to start at boot:

```
# /etc/init.d/s4t-lightning-rod enable
# /etc/init.d/s4t-lightning-rod start
```

####Configure cron to launch the Lightning-rod if not yet running:

```
# /etc/init.d/cron stop
# cp /opt/stack4things/lightning-rod/etc/cron.d/root_yun /etc/crontabs/root
# /etc/init.d/cron start
```
