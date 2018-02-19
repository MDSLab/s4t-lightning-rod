#!/bin/ash

if [ "$#" -ne 2 ]; then
        echo "Usage: ./configure_LR_arancino.sh <BOARD_ID> <WAMP_URL>"
        exit
fi

echo "Stack4Things Lightning-rod configuration with the following parameters:"
echo " --> Device UUID: "$1
echo " --> WAMP URL: "$2
echo -e "\n"


sed -i "s/\"device\":.*\"\"/\"device\": \"raspberry_pi\"/g" /var/lib/iotronic/settings.json
sed -i "s/\"code\":.*\"\"/\"code\": \"$1\"/g" /var/lib/iotronic/settings.json
sed -i "s,\"url_wamp\":.*,\"url_wamp\": \"$2\"\,,g" /var/lib/iotronic/settings.json
sed -i "s,\"url_reverse\":.*,\"url_reverse\": \"$2\"\,,g" /var/lib/iotronic/settings.json
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/lib\/node_modules\/@mdslab\/wstun\/bin\/wstun.js\"/g" /var/lib/iotronic/settings.json
echo " - settings.json file configured."


/etc/init.d/lightning-rod enable
echo " - Lightning-rod enabled at boot."


echo -e "\nLightning-rod starting..."
/etc/init.d/lightning-rod start


