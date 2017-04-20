# Raspberry Pi 2 installation guide


#### Install dependencies via apt-get:

```
apt-get install unzip socat dsniff fuse libfuse-dev pkg-config

```

#### Install NodeJS 7.x:
```
curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
apt-get install -y nodejs
node -v
```

#### Install necessary node.js modules via npm:

```
npm install -g npm
npm install -g gyp autobahn jsonfile nconf node-reverse-wstunnel tty.js fuse-bindings requestify is-running connection-tester log4js q secure-keys fs-access mknod util path

# Install statvfs node module compliant with NodeJS 7.x:
npm install -g https://github.com/PlayNetwork/node-statvfs/tarball/v3.0.0
```


#### Configure npm NODE_PATH variable

```
echo "NODE_PATH=/usr/lib/node_modules" | sudo tee -a
source /etc/profile > /dev/null
echo $NODE_PATH
```

#### Install the Lightning-rod:

```
mkdir /var/lib/iotronic/ && cd /var/lib/iotronic/
wget https://github.com/MDSLab/s4t-lightning-rod/archive/master.zip --no-check-certificate
unzip master.zip && rm -f master.zip
mv s4t-lightning-rod-master lightning-rod
mkdir plugins && mkdir drivers
cp /var/lib/iotronic/lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
chmod +x /etc/systemd/system/lightning-rod.service
systemctl daemon-reload
systemctl enable lightning-rod.service
touch /var/log/iotronic/lightning-rod.log
```

#### Configure and start the Lightning-rod
(note that you need the NODE_ID that is the code returned by the IoTronic service after node registration):

```
cp /var/lib/iotronic/lightning-rod/settings.example.json /var/lib/iotronic/settings.json
cp /var/lib/iotronic/lightning-rod/plugins.example.json /var/lib/iotronic/plugins/plugins.json
cp /var/lib/iotronic/lightning-rod/drivers.example.json /var/lib/iotronic/drivers/drivers.json

sed -i "s/\"device\":.*\"\"/\"device\": \"raspberry_pi\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"code\":.*\"\"/\"code\": \"<NODE_ID>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/lib\/node_modules\/node-reverse-wstunnel\/bin\/wstt.js\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /var/lib/iotronic/settings.json

systemctl start lightning-rod.service
```
