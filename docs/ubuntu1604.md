#Stack4Things Lightning-rod (standalone version) installation guide for Ubuntu 16.04

We tested this procedure on a Ubuntu 16.04 within a LXD container on top of a Kubuntu 16.04 on 11th October 2016. Everything needs to be run as root.

####Install dependencies via apt-get:
```
apt -y install unzip socat dsniff fuse libfuse-dev pkg-config python
```
####Install latest nodejs (and npm) distribution:
```
curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
apt-get install -y nodejs
node -v

npm install -g npm
npm config set python `which python2.7`
npm -v
```

####Install dependencies using npm:
```
npm install -g gyp autobahn jsonfile nconf node-reverse-wstunnel tty.js fuse-bindings requestify is-running connection-tester log4js q secure-keys fs-access mknod
npm install -g https://github.com/PlayNetwork/node-statvfs/tarball/v3.0.0
```

####Configure npm NODE_PATH variable
```
echo "NODE_PATH=/usr/lib/node_modules" | sudo tee -a /etc/environment
source /etc/environment > /dev/null
echo $NODE_PATH
```

####Install the Lightning-rod
```
mkdir /var/lib/iotronic && cd /var/lib/iotronic
wget https://github.com/MDSLab/s4t-lightning-rod/archive/api.zip --no-check-certificate
unzip api.zip  && rm -f api.zip
mv s4t-lightning-rod-api lightning-rod
mkdir plugins && mkdir drivers
cp /var/lib/iotronic/lightning-rod/settings.example.json /var/lib/iotronic/settings.json
cp /var/lib/iotronic/lightning-rod/modules/plugins-manager/plugins.example.json /var/lib/iotronic/plugins/plugins.json
cp /var/lib/iotronic/lightning-rod/modules/drivers-manager/drivers.example.json /var/lib/iotronic/drivers/drivers.json
cp /var/lib/iotronic/lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
chmod +x /etc/systemd/system/lightning-rod.service
systemctl daemon-reload
systemctl enable lightning-rod.service
touch /var/log/iotronic/lightning-rod.log
```

####Configure and start the Lightning-rod
Note that you will need the IP address of a working instance of a WAMP router (<WAMP_IP>), the IP address of a working instance of a Websocket reverse tunnel server (<WS_IP>), and the UUID of the node that you need to have previously registered on the IoTronic (<NODE_UUID>). Also, note that if while installing the IoTronic service, you configured a custom port and realm name for the WAMP router or a custom port for the Websocket reverse tunnel server, you will need to manually change the setting.json, accordingly. 
```
sed -i "s/\"device\":.*\"\"/\"device\": \"laptop\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"code\":.*\"\"/\"code\": \"<NODE_UUID>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/lib\/node_modules\/node-reverse-wstunnel\/bin\/wstt.js\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/<WAMP_IP>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/<WS_IP>\"/g" /var/lib/iotronic/settings.json

systemctl start lightning-rod.service
```
