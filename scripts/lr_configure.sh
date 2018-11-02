#!/bin/sh

# Configure LR ---------------------------------------------------------------------------------------------------------------------------------------------------
DEVICE=
echo -n "Enter device model ['server', 'arduino_yun', 'raspberry_pi']: "
read DEVICE
echo "-->" $DEVICE
if [ "$DEVICE" != "server" ] && [ "$DEVICE" != "arduino_yun" ] && [ "$DEVICE" != "raspberry_pi" ] ; then
    echo " --> WRONG LAYOUT SELECTED: " $DEVICE
else

    sed -i "s/\"device\":.*/\"device\": \"$DEVICE\"\,/g" $IOTRONIC_HOME/settings.json

    if [ "$DEVICE" = "arduino_yun" ]; then

        cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/init.d/s4t-lightning-rod_yun /etc/init.d/lightning-rod
        sed -i "s|<LIGHTNINGROD_HOME>|export LIGHTNINGROD_HOME=$NODE_PATH/@mdslab/iotronic-lightning-rod|g" /etc/init.d/lightning-rod

        chmod +x /etc/init.d/lightning-rod

        # Configure logrotate
        cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

        # Set WSTUN PATH
        sed -i "s|\"bin\":.*|\"bin\": \"$NODE_PATH/@mdslab/wstun/bin/wstun.js\"|g" $IOTRONIC_HOME/settings.json

    fi

    if [ "$DEVICE" = "server" ]; then

        DISTRO=`cat /etc/*release | grep DISTRIB_RELEASE | cut -d "=" -f2`

        echo "--> Server Distribution: " $DISTRO

        if [ "$DISTRO" = "14.04" ]; then

            chmod +x $NODE_PATH/@mdslab/iotronic-lightning-rod/lr-server.js

            cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/init.d/s4t-lightning-rod_ubu14 /etc/init.d/lightning-rod
            chmod +x /etc/init.d/lightning-rod

            # Configure logrotate
            cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

            # Set WSTUN PATH
            sed -i "s|\"bin\":.*|\"bin\": \"$NODE_PATH/@mdslab/wstun/bin/wstun.js\"|g" $IOTRONIC_HOME/settings.json

        elif [ "$DISTRO" = "16.04" ]; then

            chmod +x $NODE_PATH/@mdslab/iotronic-lightning-rod/lr-server.js

            cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
            sed -i "s|Environment=\"LIGHTNINGROD_HOME=\"|Environment=\"LIGHTNINGROD_HOME=$NODE_PATH/@mdslab/iotronic-lightning-rod\"|g" /etc/systemd/system/lightning-rod.service

            chmod +x /etc/systemd/system/lightning-rod.service
            systemctl daemon-reload

            # Configure logrotate
            cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

        fi

    fi


    if [ "$DEVICE" = "raspberry_pi" ]; then

        cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
        sed -i "s|Environment=\"LIGHTNINGROD_HOME=\"|Environment=\"LIGHTNINGROD_HOME=$NODE_PATH/@mdslab/iotronic-lightning-rod\"|g" /etc/systemd/system/lightning-rod.service

        chmod +x /etc/systemd/system/lightning-rod.service
        systemctl daemon-reload

        # Configure logrotate
        cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

    fi

    BOARD_ID=
    echo -n "Enter s4t board ID: "
    read BOARD_ID
    echo "-->" $BOARD_ID
    sed -i "s/\"code\":.*/\"code\": \"$BOARD_ID\"\,/g" $IOTRONIC_HOME/settings.json


    WAMP_URL=
    echo -n "Enter WAMP SERVER URL (e.g. ws://IP or wss://IP): "
    read WAMP_URL
    echo "-->" $WAMP_URL
    sed -i "s,\"url_wamp\":.*,\"url_wamp\": \"$WAMP_URL\"\,,g" $IOTRONIC_HOME/settings.json

    same_url=
    echo -n "Do you want confirm the same URL for the reverse tunnel ($WAMP_URL)? (yes/no) "
    read same_url

    if [ "$same_url" = "yes" ]; then
        sed -i "s,\"url_reverse\":.*,\"url_reverse\": \"$WAMP_URL\"\,,g" $IOTRONIC_HOME/settings.json
    else

        REVERSE_URL=
        echo -n "Enter REVERSE TUNNEL URL (e.g. ws://IP or wss://IP): "
        read REVERSE_URL
        echo "-->" $REVERSE_URL
        sed -i "s,\"url_reverse\":.*,\"url_reverse\": \"$REVERSE_URL\"\,,g" $IOTRONIC_HOME/settings.json

    fi


fi

