#!/bin/bash

echo Number of parameters: $#

if [ "$#" -ne 4 ]; then
        echo "Usage: ./install_LR_ubuntu16.04.sh <BRANCH> <NODE_UUID> <WAMP_IP> <WS_IP>"
        exit
fi

echo Installing Stack4Things Lightning-rod with the following parameters:
echo Branch: $1
echo Node UUID: $2
echo WAMP Router IP: $3
echo WS Server IP: $4

apt -y install unzip socat dsniff fuse libfuse-dev pkg-config python

curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
apt-get install -y nodejs
node -v

npm install -g npm
echo Python found at `which python2.7`
npm config set python `which python2.7`
npm -v

npm install -g gyp autobahn jsonfile nconf node-reverse-wstunnel tty.js fuse-bindings requestify is-running connection-tester log4js q secure-keys

echo "NODE_PATH=/usr/local/lib/node_modules" | sudo tee -a /etc/environment
source /etc/environment > /dev/null
echo $NODE_PATH

mkdir /opt/stack4things/ && cd /opt/stack4things/
wget https://github.com/MDSLab/s4t-lightning-rod/archive/$1.zip --no-check-certificate
unzip $1.zip && rm -f $1.zip
mv s4t-lightning-rod-$1 lightning-rod
cd lightning-rod && mkdir plugins && mkdir plugin_conf && mkdir drivers
cp /opt/stack4things/lightning-rod/plugins.example.json /opt/stack4things/lightning-rod/plugins.json
cp /opt/stack4things/lightning-rod/drivers.example.json /opt/stack4things/lightning-rod/drivers.json
cp /opt/stack4things/lightning-rod/settings.example.json /opt/stack4things/lightning-rod/settings.json
cp /opt/stack4things/lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/s4t-lightning-rod.service
chmod +x /etc/systemd/system/s4t-lightning-rod.service
systemctl daemon-reload
systemctl enable s4t-lightning-rod.service
touch /var/log/s4t-lightning-rod.log

sed -i "s/\"device\":.*\"\"/\"device\": \"laptop\"/g" /opt/stack4things/lightning-rod/settings.json
sed -i "s/\"code\":.*\"\"/\"code\": \""$2"\"/g" /opt/stack4things/lightning-rod/settings.json
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/lib\/node_modules\/node-reverse-wstunnel\/bin\/wstt.js\"/g" /opt/stack4things/lightning-rod/settings.json
sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/"$3"\"/g" /opt/stack4things/lightning-rod/settings.json
sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/"$4"\"/g" /opt/stack4things/lightning-rod/settings.json
systemctl start s4t-lightning-rod

