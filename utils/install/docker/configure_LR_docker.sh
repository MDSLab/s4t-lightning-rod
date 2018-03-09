#!/bin/sh

if [ "$#" -ne 3 ]; then
        echo "Usage: ./configure_LR_arancino.sh <BOARD_ID> <WAMP_URL> </CONFIG/PATH/>"
        exit
fi

echo "Stack4Things Lightning-rod configuration with the following parameters:"
echo " --> Device UUID: "$1
echo " --> WAMP URL: "$2
echo " --> Configuration file path: "$3
echo -e "\n"


sed -i "s/\"device\":.*\"\"/\"device\": \"server\"/g" $3
sed -i "s/\"code\":.*\"\"/\"code\": \"$1\"/g" $3
sed -i "s,\"url_wamp\":.*,\"url_wamp\": \"$2\"\,,g" $3
sed -i "s,\"url_reverse\":.*,\"url_reverse\": \"$2\"\,,g" $3
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/lib\/node_modules\/@mdslab\/wstun\/bin\/wstun.js\"/g" $3
echo " - settings.json file configured."
