#!/bin/ash

if [ "$#" -ne 4 ]; then
        echo "Usage: ./configure_LR_arancino.sh <IOTRONIC_BOARD_ID> <IOTRONIC_BOARD_PASSWORD> <WAMP_URL> <WSTUN_URL>"
        exit
fi

echo "Stack4Things Lightning-rod configuration with the following parameters:"
echo " --> Board UUID: "$1
echo " --> Board password: "$2
echo " --> WAMP URL: "$3
echo " --> WSTUN URL: "$4
echo -e "\n"

sed -i "s/\"code\":.*\"\"/\"code\": \"$1\"/g" /etc/iotronic/authentication.json
sed -i "s/\"layout\":.*\"\"/\"layout\": \"raspberry_pi\"/g" /etc/iotronic/authentication.json
sed -i "s,\"password\":.*,\"password\": \"$2\",g" /etc/iotronic/authentication.json

sed -i "s,\"url_wamp\":.*,\"url_wamp\": \"$3\"\,,g" /etc/iotronic/authentication.json
sed -i "s,\"port_wamp\":.*,\"port_wamp\": \"443\"\,,g" /etc/iotronic/authentication.json

sed -i "s,\"ws_url\":.*,\"ws_url\": \"$4\"\,,g" /etc/iotronic/authentication.json
sed -i "s,\"ws_port\":.*,\"ws_port\": \"443\"\,,g" /etc/iotronic/authentication.json
sed -i "s/\"bin\":.*\"wstun\"/\"bin\":\"\/usr\/lib\/node_modules\/@mdslab\/wstun\/bin\/wstun.js\"/g" /etc/iotronic/authentication.json

echo " - authentication.json file configured."


#cp /etc/init-cfg/lightning-rod /etc/init.d/
/etc/init.d/lightning-rod enable
echo " - Lightning-rod enabled at boot."


echo -e "\nLightning-rod starting..."
/etc/init.d/lightning-rod restart


