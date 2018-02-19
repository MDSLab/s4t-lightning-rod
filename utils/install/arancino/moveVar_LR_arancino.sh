#!/bin/ash


echo "Moving /var/ folder..."
rm /var
cd /
mkdir var
cp -a /tmp/etc/ /var/
cp -a /tmp/lib/ /var/
cp -a /tmp/log/ /var/
cp -a /tmp/run/ /var/
echo " - /var/ folder moved."



