#!/bin/sh

if [ "$#" -ne 3 ]; then
        echo "Usage: ./configure_LR_arancino.sh <BOARD_ID> <BOARD_PASSWORD> <WAMP_URL> </CONFIG/PATH/>"
        exit
fi

echo "Stack4Things Lightning-rod configuration with the following parameters:"
echo " --> Device UUID: "$1
echo " --> Device password: "$2
echo " --> WAMP URL: "$3
echo " --> Configuration file path: "$4

sed -i "s/\"layout\":.*\"\"/\"layout\": \"server\"/g" $4
sed -i "s/\"code\":.*\"\"/\"code\": \"$1\"/g" $4
sed -i "s/\"password\":.*\"\"/\"password\": \"$1\"/g" $4
sed -i "s,\"url_wamp\":.*,\"url_wamp\": \"$3\"\,,g" $4
sed -i "s,\"ws_url\":.*,\"ws_url\": \"$3\"\,,g" $4
sed -i "s/\"bin\":.*\"\"/\"bin\": \"\/usr\/lib\/node_modules\/@mdslab\/wstun\/bin\/wstun.js\"/g" $4
echo -e "\nauthentication.json file configured."
