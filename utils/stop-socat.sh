#! /bin/sh
set -o verbose

PORT="5000"
IFACE="soc"$PORT

PID_SOCAT=$(ps www | grep socat | grep $IFACE | awk '{print $1}')
PID_WSTT=$(ps www | grep wstt | grep $PORT | awk '{print $1}')
kill -9 $PID_WSTT $PID_SOCAT

