#! /bin/sh
set -o verbose

LOCALPORT="20000"
REMOTEPORT="5000"
IPTUN="10.0.0.6"

TUNNAME="soc"$REMOTEPORT
WSURL="ws://212.189.207.205:8080"

socat -d -d TCP-L:$LOCALPORT,bind=localhost,reuseaddr,forever,interval=10 TUN:$IPTUN/30,tun-name=$TUNNAME,up &
/opt/usr/lib/node_modules/node-reverse-wstunnel/bin/wstt.js -r $REMOTEPORT:localhost:$LOCALPORT $WSURL &
ifconfig $TUNNAME
while [ $? -ne 0 ];
do
sleep 3; ip link set $TUNNAME up;
done