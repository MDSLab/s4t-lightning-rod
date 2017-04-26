#!/bin/sh

# Configure LR ---------------------------------------------------------------------------------------------------------------------------------------------------
DEVICE=
echo -n "Enter device model: "
read DEVICE
echo "-->" $DEVICE
sed -i "s/\"device\":.*\"\"/\"device\": \"$DEVICE\"/g" /var/lib/iotronic/settings.json

if [ "$DEVICE" = "arduino_yun" ]; then

    cp /usr/lib/node_modules/iotronic-lightning-rod/etc/init.d/s4t-lightning-rod_yun /etc/init.d/lightning-rod
    chmod +x /etc/init.d/lightning-rod

fi

if [ "$DEVICE" = "server" ]; then

    DISTRO=`cat /etc/*release | grep DISTRIB_RELEASE | cut -d "=" -f2`

    echo "--> Server Distribution: " $DISTRO

    if [ "$DISTRO" = "14.04" ]; then

        chmod +x /usr/local/lib/node_modules/iotronic-lightning-rod/lr-server.js
        /usr/bin/npm install -g https://github.com/PlayNetwork/node-statvfs/tarball/v3.0.0

        cp /usr/local/lib/node_modules/iotronic-lightning-rod/etc/init.d/s4t-lightning-rod_ubu14 /etc/init.d/lightning-rod
        chmod +x /etc/init.d/lightning-rod

    elif [ "$DISTRO" = "16.04" ]; then

        chmod +x /usr/lib/node_modules/iotronic-lightning-rod/lr-server.js

        /usr/bin/npm install -g https://github.com/PlayNetwork/node-statvfs/tarball/v3.0.0

        cp /usr/lib/node_modules/iotronic-lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
        chmod +x /etc/systemd/system/lightning-rod.service
        systemctl daemon-reload

    fi

fi


if [ "$DEVICE" = "raspberry_pi" ]; then
    cp /usr/lib/node_modules/iotronic-lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
    chmod +x /etc/systemd/system/lightning-rod.service
    systemctl daemon-reload
fi

BOARD_ID=
echo -n "Enter s4t board ID: "
read BOARD_ID
echo "-->" $BOARD_ID
sed -i "s/\"code\":.*\"\"/\"code\": \"$BOARD_ID\"/g" /var/lib/iotronic/settings.json

#WSTT=
#echo -n "Enter WSTT path: "
#read WSTT
#echo "-->" $WSTT
#sed -i "s/\"bin\":.*\"\"/\"bin\": \"$WSTTn\"/g" /opt/stack4things/lightning-rod/settings.json
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/lib\/node_modules\/node-reverse-wstunnel\/bin\/wstt.js\"/g" /var/lib/iotronic/settings.json


WAMP_IP=
echo -n "Enter WAMP SERVER IP: "
read WAMP_IP
echo "-->" $WAMP_IP
sed -i "s/\"url_wamp\":.*\"\"/\"url_wamp\": \"ws:\/\/$WAMP_IP\"/g" /var/lib/iotronic/settings.json

same_ip=
echo -n "Do you want confirm the same IP for the reverse tunnel ($WAMP_IP)? (yes/no) "
read same_ip

if [ "$same_ip" = "yes" ]; then
	#echo "--> same IP confirmed..."
	sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/$WAMP_IP\"/g" /var/lib/iotronic/settings.json
else

	REVERSE_IP=
	echo -n "Enter REVERSE TUNNEL IP: "
	read REVERSE_IP
	echo "-->" $REVERSE_IP
	sed -i "s/\"url_reverse\":.*\"\"/\"url_reverse\": \"ws:\/\/$REVERSE_IP\"/g" /var/lib/iotronic/settings.json

fi
