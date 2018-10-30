# Arduino YUN/Linino ONE installation guide


## Install requirements

#### Configure npm NODE_PATH variable
```
echo "export NODE_PATH=$NODE_PATH" >> /etc/profile
source /etc/profile > /dev/null
echo $NODE_PATH
```

##### Install dependencies via opkg
```
opkg update
opkg install logrotate ntpdate nano git unzip socat ip dsniff fuse-utils node-autobahn node-jsonfile node-nconf node-ideino-linino-lib node-fuse-bindings node-mknod node-statvfs gdb
opkg install kmod-gre kmod-ip6-tunnel kmod-iptunnel4 kmod-iptunnel6 kmod-ipv6 kmod-tun
```

## Install from NPM
```
npm install -g --unsafe @mdslab/wstun

npm install -g --unsafe @mdslab/iotronic-lightning-rod

reboot
```
If you have some problems during npm dependencies installation phase we suggest you to follow the "Install from source-code" procedure.



## Install from source-code

##### Install required NodeJS modules via npm
```
npm install -g requestify is-running connection-tester@0.1.2 log4js@1.1.1 q fs-access util md5 python-shell net lsof
```

##### Install the Lightning-rod
```
mkdir -p /etc/iotronic/
mkdir -p /var/lib/iotronic/plugins
mkdir -p /var/lib/iotronic/drivers/mountpoints/
mkdir -p $NODE_PATH/@mdslab/

git clone --depth=1 git://github.com/MDSLab/s4t-lightning-rod.git $NODE_PATH/@mdslab/iotronic-lightning-rod

cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/init.d/s4t-lightning-rod_yun /etc/init.d/lightning-rod
sed -i "s|<LIGHTNINGROD_HOME>|export LIGHTNINGROD_HOME=$NODE_PATH/@mdslab/iotronic-lightning-rod|g" /etc/init.d/lightning-rod
chmod +x /etc/init.d/lightning-rod

mkdir /var/log/iotronic/
mkdir -p /var/log/wstun/
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

echo "export IOTRONIC_HOME=/var/lib/iotronic" >> /etc/profile
echo "export LIGHTNINGROD_HOME=$NODE_PATH/@mdslab/iotronic-lightning-rod" >> /etc/profile
source /etc/profile

cp $NODE_PATH/@mdslab/iotronic-lightning-rod/utils/templates/authentication.example /etc/iotronic/authentication.json
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/utils/templates/settings.example.json /var/lib/iotronic/settings.json
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/modules/plugins-manager/plugins.example.json /var/lib/iotronic/plugins/plugins.json
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/modules/drivers-manager/drivers.example.json /var/lib/iotronic/drivers/drivers.json
```

## Configure Lightning-rod
Now we have to choose which Lightning-rod modules enable. In the /var/lib/iotronic/settings.json configuration file there is the "modules" section:
```
"modules": {

        "plugins_manager": {
            "enabled": true,
            "boot": true,
            "alive_timer": 60
        },
        "services_manager": {
            "enabled": true,
            "boot": false
        },

        etc

}
```

In each module section (e.g. "plugins_manager", "services_manager", etc) to enable that module you have to set at "true" the "enabled" field.

At the end of the installation process we have to execute the LR configuration script:
```
$NODE_PATH/@mdslab/iotronic-lightning-rod/scripts/lr_configure
```
This script asks the following information:
```
* device type: 1 -> 'server', 2 -> 'arduino_yun', 3 -> 'raspberry_pi'

* Board ID: UUID released by the registration process managed by IoTronic.

* Board password: password to log in to Iotronic

* WAMP server URL

* WSTUN URL
```


##### Configure cron to launch the Lightning-rod if not yet running
```
/etc/init.d/cron stop
cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/cron.d/root_yun /etc/crontabs/root
/etc/init.d/cron start
```

##### Start Lightning-rod and configure it to start at boot
```
/etc/init.d/lightning-rod enable
/etc/init.d/lightning-rod start

tail -f /var/log/iotronic/lightning-rod.log
```
