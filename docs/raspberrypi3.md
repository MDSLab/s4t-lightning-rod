#Raspberry Pi 3 installation guide
We tested this procedure on a ubuntu-16.04-preinstalled-server. Everything needs to be run as root.

####Install OS distribution "ubuntu-16.04-preinstalled-server":
```
wget http://www.finnie.org/software/raspberrypi/ubuntu-rpi3/ubuntu-16.04-preinstalled-server-armhf+raspi3.img.xz
sudo unxz ubuntu-16.04-preinstalled-server-armhf+raspi3.img.xz
sudo dd bs=4M if=ubuntu-16.04-preinstalled-server-armhf+raspi3.img of=/dev/sdb
```


####Install dependencies via apt-get:

```
sudo apt update
sudo apt upgrade
sudo reboot
apt -y install unzip socat dsniff fuse libfuse-dev pkg-config
```

####Install NodeJS 7.x:
```
curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
apt-get install -y nodejs
node -v
```

####Install necessary node.js modules via npm:

```
npm install -g npm
npm install -g gyp autobahn jsonfile nconf node-reverse-wstunnel tty.js fuse-bindings requestify is-running connection-tester log4js q secure-keys fs-access mknod util path

# Install statvfs node module compliant with NodeJS 7.x: 
npm install -g https://github.com/PlayNetwork/node-statvfs/tarball/v3.0.0
```

####Configure npm NODE_PATH variable

```
echo "NODE_PATH=/usr/local/lib/node_modules" | sudo tee -a 
source /etc/profile > /dev/null
echo $NODE_PATH
```

####Install the Lightning-rod:

```
# mkdir /opt/stack4things/ && cd /opt/stack4things/
# wget https://github.com/MDSLab/s4t-lightning-rod/archive/master.zip --no-check-certificate
# unzip master.zip && rm -f master.zip
# mv s4t-lightning-rod-master lightning-rod
# cd lightning-rod && mkdir plugins && mkdir plugin_conf && mkdir drivers
# cp /opt/stack4things/lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/s4t-lightning-rod.service
# chmod +x /etc/systemd/system/s4t-lightning-rod.service
# systemctl daemon-reload
# systemctl enable s4t-lightning-rod.service
# touch /var/log/s4t-lightning-rod.log
```

####Configure and start the Lightning-rod
(note that you need the NODE_ID that is the code returned by the IoTronic service after node registration):

```
# cp /opt/stack4things/lightning-rod/plugins.example.json /opt/stack4things/lightning-rod/plugins.json
# cp /opt/stack4things/lightning-rod/drivers.example.json /opt/stack4things/lightning-rod/drivers.json
# cp /opt/stack4things/lightning-rod/settings.example.json /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"device\":.*\"\"/\"device\": \"raspberry_pi\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"code\":.*\"\"/\"code\": \"<NODE_ID>\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/lib\/node_modules\/node-reverse-wstunnel\/bin\/wstt.js\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /opt/stack4things/lightning-rod/settings.json
# systemctl start s4t-lightning-rod
```
