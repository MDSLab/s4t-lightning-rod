#! /bin/sh
set -o verbose

IFACE="bnetwork-141422"
REMOTEIP="10.0.0.5"
LOCALIP="10.0.0.6"

VIP="192.168.99.2"
VMASK="24"

ip link add $IFACE type gretap remote $REMOTEIP local $LOCALIP
ip addr add $VIP/$VMASK dev $IFACE
ip link set $IFACE up


