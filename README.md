#Stack4Things Lightning-rod

Stack4Things is an Internet of Things framework developed by the Mobile and Distributed Systems Lab (MDSLab) at the University of Messina, Italy. Stack4Things is an open source project that helps you in managing IoT device fleets without caring about their physical location, their network configuration, their underlying technology. It is a Cloud-oriented horizontal solution providing IoT object virtualization, customization, and orchestration. Stack4Things provides you with an out-of-the-box experience on several of the most popular embedded and mobile systems.

Lighthing-rod is the node-side component in the Stack4Things architecture. It acts as a probe in the IoT node and interacts with the IoTronic service connecting the node to the Cloud. This version is the one that works with the standalone version of the IoTronic service that you can find [here] (https://github.com/MDSLab/s4t-iotronic-standalone).

Lightning-rod has been tested to work on:

* Raspberry Pi 2
* Arduino YUN
* Linino ONE

##Installation instructions

###Raspberry Pi 2

We tested this procedure on a Raspberry Pi 2 with Raspbian Jessie Lite installed. Everything needs to be run as root.

Install dependencies via apt-get:

```
# apt-get install nodejs npm nodejs-legacy unzip socat dsniff fuse libfuse-dev
```

Install necessary node.js modules via npm:

```
# npm install -g npm
# npm install -g gyp autobahn jsonfile nconf reverse-wstunnel tty.js fuse-bindings requestify is-running connection-tester log4js q
```

Install the Lightning-rod:

```
# mkdir /opt/stack4things/ && cd /opt/stack4things/
# wget https://github.com/MDSLab/s4t-lightning-rod/archive/master.zip --no-check-certificate
# unzip master.zip && rm -f master.zip
# mv s4t-lightning-rod-master lightning-rod
# cd lightning-rod && mkdir plugins && mkdir plugin_conf
# sudo npm link autobahn jsonfile nconf reverse-wstunnel tty.js fuse-bindings requestify is-running connection-tester log4js q
# cp /opt/stack4things/lightning-rod/etc/init.d/s4t-lightning-rod_raspberry /etc/init.d/s4t-lightning-rod
# chmod +x /etc/init.d/s4t-lightning-rod
# touch /var/log/s4t-lightning-rod.log
```

Configure the Lightning-rod (note that you need the NODE_ID that is the code returned by the IoTronic service after node registration):

```
# cp /opt/stack4things/lightning-rod/settings.example.json /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"device\":\"\"/\"device\":\"raspberry\"/g" /opt/stack4things/lightning-rod/settings.json
# sed -i "s/\"code\":\"\"/\"code\":\"NODE_ID\"/g" /opt/stack4things/lightning-rod/settings.json
```

Start the Lightning-rod and configure it to start at boot:

```
# /etc/init.d/s4t-lightning-rod enable
# /etc/init.d/s4t-lightning-rod start
```

Force cron to launch the Lightinig-rod if not yet running:

```
# /etc/init.d/cron stop
# cp /opt/stack4things/lightning-rod/etc/cron.d/root /etc/cron.d/
# /etc/init.d/cron start
```

###Arduino YUN/Linino ONE

ToDo



##Scientific References
Scientific papers describing the work on Stack4Things by the University of Messina can be found here:

[**MDSL**] (http://mdslab.unime.it/biblio)

In particular, you can find details about Stack4Things in the following papers:

G. Merlino, D. Bruneo, S. Distefano, F. Longo, A. Puliafito - Stack4Things: integrating IoT with OpenStack in a Smart City context. Published on Sensors and Smart Cities, Smart Computing Workshops (SMARTCOMP Workshops), 2014 International Conference on, pp. 21,28, 5-5 Nov. 2014.

G. Merlino,  D. Bruneo,  S. Distefano,  F. Longo,  A. Puliafito, and A. Al-Anbuky - A Smart City Lighting Case Study on an OpenStack-Powered Infrastructure, Published on Sensors 2015, 15(7), pp. 16314-16335.

