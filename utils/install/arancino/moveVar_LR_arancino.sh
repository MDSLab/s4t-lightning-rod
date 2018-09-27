#!/bin/ash


#echo "Moving /var/ folder..."
#mkdir /var
#mv /tmp/etc /var
#mv /tmp/lib /var
#mv /tmp/log /var
#mv /tmp/run /var
#mv /tmp/lock /var
#mv /tmp/state /var
#mv /tmp/tmp /var
#cd /
mkdir /var_tmp
cp -a /tmp/etc/ /var_tmp/
cp -a /tmp/lib/ /var_tmp/
cp -a /tmp/log/ /var_tmp/
cp -a /tmp/run/ /var_tmp/
rm /var
mv /var_tmp /var

echo " - /var/ folder moved."