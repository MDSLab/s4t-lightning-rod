#!/bin/sh

IOTRONIC_AUTH="/etc/iotronic"

# Configure LR ---------------------------------------------------------------------------------------------------------------------------------------------------
DEVICE=
echo -n "Enter device model [1 -> 'server', 2 -> 'arduino_yun', 3 -> 'raspberry_pi']: "
read DEVICE
echo "-->" $DEVICE
if [ "$DEVICE" != "1" ] && [ "$DEVICE" != "2" ] && [ "$DEVICE" != "3" ] ; then
    echo " --> WRONG LAYOUT SELECTED: " $DEVICE
else

    if [ "$DEVICE" = "1" ]; then

        sed -i "s/\"layout\":.*/\"layout\": \"server\"\,/g" $IOTRONIC_AUTH/authentication.json

        DISTRO=`cat /etc/*release | grep DISTRIB_RELEASE | cut -d "=" -f2`

        echo "--> Server Distribution: " $DISTRO

        if [ "$DISTRO" = "14.04" ]; then

            chmod +x $NODE_PATH/@mdslab/iotronic-lightning-rod/lr-server.js

            cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/init.d/s4t-lightning-rod_ubu14 /etc/init.d/lightning-rod
            chmod +x /etc/init.d/lightning-rod

            # Configure logrotate
            cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

            # Set WSTUN PATH
            sed -i "s|\"bin\":.*|\"bin\": \"$NODE_PATH/@mdslab/wstun/bin/wstun.js\"|g" $IOTRONIC_AUTH/authentication.json


        elif [ "$DISTRO" = "16.04" ]; then

            chmod +x $NODE_PATH/@mdslab/iotronic-lightning-rod/lr-server.js

            cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
            sed -i "s|Environment=\"LIGHTNINGROD_HOME=\"|Environment=\"LIGHTNINGROD_HOME=$NODE_PATH/@mdslab/iotronic-lightning-rod\"|g" /etc/systemd/system/lightning-rod.service
            chmod +x /etc/systemd/system/lightning-rod.service
            systemctl daemon-reload

            # Configure logrotate
            cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

            # Set WSTUN PATH
            sed -i "s|\"bin\":.*|\"bin\": \"$NODE_PATH/@mdslab/wstun/bin/wstun.js\"|g" $IOTRONIC_AUTH/authentication.json

        fi

    fi




    if [ "$DEVICE" = "2" ]; then

        sed -i "s/\"layout\":.*/\"layout\": \"arduino_yun\"\,/g" $IOTRONIC_AUTH/authentication.json

        cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/init.d/s4t-lightning-rod_yun /etc/init.d/lightning-rod
        sed -i "s|<LIGHTNINGROD_HOME>|export LIGHTNINGROD_HOME=$NODE_PATH/@mdslab/iotronic-lightning-rod|g" /etc/init.d/lightning-rod
        chmod +x /etc/init.d/lightning-rod

        # Configure logrotate
        cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

        # Set WSTUN PATH
        sed -i "s|\"bin\":.*|\"bin\": \"$NODE_PATH/@mdslab/wstun/bin/wstun.js\"|g" $IOTRONIC_AUTH/authentication.json

    fi


    if [ "$DEVICE" = "3" ]; then

        sed -i "s/\"layout\":.*/\"layout\": \"raspberry_pi\"\,/g" $IOTRONIC_AUTH/authentication.json

        cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/systemd/system/s4t-lightning-rod.service /etc/systemd/system/lightning-rod.service
        sed -i "s|Environment=\"LIGHTNINGROD_HOME=\"|Environment=\"LIGHTNINGROD_HOME=$NODE_PATH/@mdslab/iotronic-lightning-rod\"|g" /etc/systemd/system/lightning-rod.service
        chmod +x /etc/systemd/system/lightning-rod.service
        systemctl daemon-reload

        # Configure logrotate
        cp $NODE_PATH/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

        # Set WSTUN PATH
        sed -i "s|\"bin\":.*|\"bin\": \"$NODE_PATH/@mdslab/wstun/bin/wstun.js\"|g" $IOTRONIC_AUTH/authentication.json

    fi

    BOARD_ID=
    echo -n "Enter s4t board ID: "
    read BOARD_ID
    echo "-->" $BOARD_ID
    sed -i "s/\"code\":.*/\"code\": \"$BOARD_ID\"\,/g" $IOTRONIC_AUTH/authentication.json


    LR_PW=
    echo -n "Enter LR password: "
    read LR_PW
    echo "-->" $LR_PW
    sed -i "s,\"password\":.*,\"password\": \"$LR_PW\",g" $IOTRONIC_AUTH/authentication.json


    WAMP_URL=
    echo -n "Enter WAMP SERVER URL (e.g. ws://IP or wss://IP): "
    read WAMP_URL
    echo "-->" $WAMP_URL
    sed -i "s,\"url_wamp\":.*,\"url_wamp\": \"$WAMP_URL\"\,,g" $IOTRONIC_AUTH/authentication.json


    same_url=
    echo -n "Do you want confirm the same URL for the reverse tunnel ($WAMP_URL)? (yes/no) "
    read same_url

    if [ "$same_url" = "yes" ]; then
        sed -i "s,\"ws_url\":.*,\"ws_url\": \"$WAMP_URL\"\,,g" $IOTRONIC_AUTH/authentication.json
    else

        WSTUN_URL=
        echo -n "Enter WSTUN URL (e.g. ws://IP or wss://IP): "
        read WSTUN_URL
        echo "-->" $WSTUN_URL
        sed -i "s,\"ws_url\":.*,\"ws_url\": \"$WSTUN_URL\"\,,g" $IOTRONIC_AUTH/authentication.json

    fi


fi
