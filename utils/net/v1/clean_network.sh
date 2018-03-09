#!/bin/sh
#set -o verbose


PORT="20000"
IFACE="socat0"

PID_SOCAT=$(ps www | grep TCP-L | grep $IFACE | awk '{print $1}')
PID_WSTUN=$(ps www | grep wstun | grep $PORT | awk '{print $1}')
kill -9 $PID_WSTUN $PID_SOCAT


LISTIF=$(ifconfig | grep - | awk '{print $1}')
for i in $LISTIF
do 
echo $i
ip link del $i
done

LISTBR=$(ifconfig | grep br | awk '{print $1}')
for i in $LISTBR
do 
echo $i
ip link set $i down
brctl delbr  $i
done
