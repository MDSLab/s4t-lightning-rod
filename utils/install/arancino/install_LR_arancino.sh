#!/bin/ash

echo -e "Installing Stack4Things Lightning-rod.\n"


echo "Configure IoTronic environment:"
mkdir -p /var/lib/iotronic/
cd /var/lib/iotronic/ && mkdir plugins && mkdir drivers
cp /usr/lib/node_modules/@mdslab/iotronic-lightning-rod/utils/templates/settings.example.json /var/lib/iotronic/settings.json
cp /usr/lib/node_modules/@mdslab/iotronic-lightning-rod/modules/plugins-manager/plugins.example.json /var/lib/iotronic/plugins/plugins.json
cp /usr/lib/node_modules/@mdslab/iotronic-lightning-rod/modules/drivers-manager/drivers.example.json /var/lib/iotronic/drivers/drivers.json


if [ -e /etc/iotronic/authentication.json ]
then
	# set the new default password
	echo -e "--> Authentication settings file already present"
else
	echo -e "--> Authentication settings file missing. Added..."
    mkdir -p /etc/iotronic/
    cp /usr/lib/node_modules/@mdslab/iotronic-lightning-rod/utils/templates/authentication.example.json /etc/iotronic/authentication.json
fi

echo " - Lightning-rod environment configured."


mkdir -p /var/log/iotronic/plugins
touch /var/log/iotronic/lightning-rod.log


mkdir -p /var/log/wstun
touch /var/log/wstun/wstun.log

cp /usr/lib/node_modules/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

echo " - logging configured."


echo "export NODE_PATH=/usr/lib/node_modules" >> /etc/profile
echo "export IOTRONIC_HOME=/var/lib/iotronic" >> /etc/profile
echo "export LIGHTNINGROD_HOME=/usr/lib/node_modules/@mdslab/iotronic-lightning-rod" >> /etc/profile
echo "export NODE_TLS_REJECT_UNAUTHORIZED=0" >> /etc/profile
source /etc/profile
echo " - environment configured:"
echo " --> NODE_PATH: "$NODE_PATH
echo " --> NODE_TLS_REJECT_UNAUTHORIZED "$NODE_TLS_REJECT_UNAUTHORIZED
echo " --> IOTRONIC_HOME: "$IOTRONIC_HOME
echo " --> LIGHTNINGROD_HOME: "$LIGHTNINGROD_HOME


cp /usr/lib/node_modules/@mdslab/iotronic-lightning-rod/etc/init.d/s4t-lightning-rod_openwrt /etc/init.d/lightning-rod
sed -i "s/<LIGHTNINGROD_HOME>/export LIGHTNINGROD_HOME=\/usr\/lib\/node_modules\/@mdslab\/iotronic-lightning-rod/g" /etc/init.d/lightning-rod
chmod +x /etc/init.d/lightning-rod
echo " - init.d script installed."


cp /usr/lib/node_modules/@mdslab/iotronic-lightning-rod/etc/cron.d/root_openwrt /etc/crontabs/root
echo " - crond configuration installed."


#echo "Rebooting..."
#reboot


