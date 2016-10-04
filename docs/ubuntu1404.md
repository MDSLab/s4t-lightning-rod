#Ubuntu 14.04 client installation

We tested this procedure on a Ubuntu 14.04. Everything needs to be run as root.

####Install dependencies via apt-get:

```
# apt-get install nodejs npm nodejs-legacy unzip socat dsniff fuse libfuse-dev
```

####Install necessary node.js modules via npm:

```
# npm install -g npm
# npm install -g gyp autobahn jsonfile nconf node-reverse-wstunnel tty.js fuse-bindings requestify is-running connection-tester log4js q secure-keys
```

####Configure npm NODE_PATH variable

```
# echo "export NODE_PATH=/usr/local/lib/node_modules/" | sudo tee -a /etc/profile
# source /etc/profile > /dev/null
# echo $NODE_PATH
```

####Install the Lightning-rod:

```
# mkdir /opt/stack4things/ && cd /opt/stack4things/
# wget https://github.com/MDSLab/s4t-lightning-rod/archive/master.zip --no-check-certificate
# unzip master.zip && rm -f master.zip
# mv s4t-lightning-rod-master lightning-rod
# cd lightning-rod && mkdir plugins && mkdir plugin_conf && mkdir drivers
# touch /var/log/s4t-lightning-rod.log
# cp s4t-lightning-rod_ubu14 /etc/init.d/s4t-lightning-rod
# echo "<IOTRONIC-SERVER-IP> s4t-iotronic" >> /etc/hosts && cat /etc/hosts
```

####Configure and start the Lightning-rod
(note that you need the NODE_ID that is the code returned by the IoTronic service after node registration):

```
# mkdir /opt/stack4things/lightning-rod/drivers/
# cp /opt/stack4things/lightning-rod/settings.example.json /opt/stack4things/lightning-rod/settings.json
# cp /opt/stack4things/lightning-rod/plugins.example.json /opt/stack4things/lightning-rod/plugins.json
# cp /opt/stack4things/lightning-rod/drivers.example.json /opt/stack4things/lightning-rod/drivers.json
# sed -i "s/\"device\":.*\"\"/\"device\": \"laptop\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"code\":.*\"\"/\"code\": \"<NODE_ID>\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/local\/lib\/node_modules\/node-reverse-wstunnel\/bin\/wstt.js\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /opt/stack4things/lightning-rod/settings.json
# /etc/init.d/s4t-lightning-rod start/stop/restart/status
```
