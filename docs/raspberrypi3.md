# Raspberry Pi 3 installation guide
We tested this procedure on a ubuntu-16.04-preinstalled-server. Everything needs to be run as root.

## Install OS distribution "ubuntu-16.04-preinstalled-server"
```
wget http://www.finnie.org/software/raspberrypi/ubuntu-rpi3/ubuntu-16.04-preinstalled-server-armhf+raspi3.img.xz
sudo unxz ubuntu-16.04-preinstalled-server-armhf+raspi3.img.xz
sudo dd bs=4M if=ubuntu-16.04-preinstalled-server-armhf+raspi3.img of=/dev/sdb
```

## Install requirements

##### Install dependencies via apt-get
```
sudo apt update
sudo apt upgrade
sudo reboot
apt -y install unzip socat dsniff fuse libfuse-dev pkg-config
```

##### Install NodeJS 7.x
```
curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
apt-get install -y nodejs
node -v
```

##### Configure npm NODE_PATH variable
```
echo "export NODE_PATH=/usr/lib/node_modules" | tee -a
source /etc/profile > /dev/null
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

##### Install required NodeJS modules via npm

```
npm install -g npm
npm install -g gyp autobahn jsonfile nconf node-reverse-wstunnel tty.js fuse-bindings requestify is-running connection-tester log4js q secure-keys fs-access mknod util path

# Install statvfs node module compliant with NodeJS 7.x: 
npm install -g https://github.com/PlayNetwork/node-statvfs/tarball/v3.0.0
```



##### Install the Lightning-rod

```
mkdir /var/lib/iotronic/ && cd /var/lib/iotronic/
git clone git://github.com/MDSLab/s4t-lightning-rod.git
mv s4t-lightning-rod iotronic-lightning-rod
mkdir plugins && mkdir drivers

cp /var/lib/iotronic/iotronic-lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
sed -i "s/Environment=\"LIGHTNINGROD_HOME=\"/Environment=\"LIGHTNINGROD_HOME=\/var\/lib\/iotronic\/iotronic-lightning-rod\"/g" /etc/systemd/system/lightning-rod.service
chmod +x /etc/systemd/system/lightning-rod.service
systemctl daemon-reload

touch /var/log/iotronic/lightning-rod.log

echo "export IOTRONIC_HOME=/var/lib/iotronic/iotronic-lightning-rod" >> /etc/profile
echo "export LIGHTNINGROD_HOME=$IOTRONIC_HOME/lightning-rod" >> /etc/profile
source /etc/profile
```

##### Configure and start the Lightning-rod
Note that you need the NODE_ID that is the code returned by the IoTronic service after node registration.

```
cp /var/lib/iotronic/iotronic-lightning-rod/settings.example.json /var/lib/iotronic/settings.json
cp /var/lib/iotronic/iotronic-lightning-rod/plugins.example.json /var/lib/iotronic/plugins/plugins.json
cp /var/lib/iotronic/iotronic-lightning-rod/drivers.example.json /var/lib/iotronic/drivers/drivers.json

sed -i "s/\"device\":.*\"\"/\"device\": \"raspberry_pi\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"code\":.*\"\"/\"code\": \"<NODE_ID>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/lib\/node_modules\/node-reverse-wstunnel\/bin\/wstt.js\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/<IOTRONIC-SERVER-IP>\"/g" /var/lib/iotronic/settings.json
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
systemctl enable lightning-rod.service

systemctl start lightning-rod.service

tail -f /var/log/iotronic/lightning-rod.log

```
