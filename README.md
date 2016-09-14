#Stack4Things Lightning-rod

Stack4Things is an Internet of Things framework developed by the Mobile and Distributed Systems Lab (MDSLab) at the University of Messina, Italy. Stack4Things is an open source project that helps you in managing IoT device fleets without caring about their physical location, their network configuration, their underlying technology. It is a Cloud-oriented horizontal solution providing IoT object virtualization, customization, and orchestration. Stack4Things provides you with an out-of-the-box experience on several of the most popular embedded and mobile systems.

Lighthing-rod is the node-side component in the Stack4Things architecture. It acts as a probe in the IoT node and interacts with the IoTronic service connecting the node to the Cloud. This version is the one that works with the standalone version of the IoTronic service that you can find [**here**](https://github.com/MDSLab/s4t-iotronic-standalone).

Lightning-rod has been tested to work on:

* Raspberry Pi 2
* Arduino YUN
* Linino ONE
* Ubuntu 14.04 

##Installation instructions

###Raspberry Pi 2

We tested this procedure on a Raspberry Pi 2 with Raspbian Jessie Lite installed. Everything needs to be run as root.

[Installation guide](docs/raspberrypi2.md)



###Arduino YUN/Linino ONE

We tested this procedure on an Arduino YUN with LininoOS and LininoIO installed. Everything needs to be run as root. For the installation to be completed successfully, you need a working Node.js environment and a working kernel with gre, tun, ipv6, tunnel4, tunnel6, and ip6_tunnel module packages (kmod-*) installed.

[Installation guide](docs/arduinoyun.md)



##Scientific References
Scientific papers describing the work on Stack4Things by the University of Messina can be found [**here**](http://mdslab.unime.it/biblio).

In particular, you can find details about Stack4Things in the following papers:

G. Merlino, D. Bruneo, S. Distefano, F. Longo, A. Puliafito - Stack4Things: integrating IoT with OpenStack in a Smart City context. Published on Sensors and Smart Cities, Smart Computing Workshops (SMARTCOMP Workshops), 2014 International Conference on, pp. 21,28, 5-5 Nov. 2014.

G. Merlino,  D. Bruneo,  S. Distefano,  F. Longo,  A. Puliafito, and A. Al-Anbuky - A Smart City Lighting Case Study on an OpenStack-Powered Infrastructure, Published on Sensors 2015, 15(7), pp. 16314-16335.

