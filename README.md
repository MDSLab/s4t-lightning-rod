#Stack4Things Lightning-rod (standalone version)

Stack4Things is an Internet of Things framework developed by the Mobile and Distributed Systems Lab (MDSLab) at the University of Messina, Italy. Stack4Things is an open source project that helps you in managing IoT device fleets without caring about their physical location, their network configuration, their underlying technology. It is a Cloud-oriented horizontal solution (integrated with OpenStack) providing IoT object virtualization, customization, and orchestration. Stack4Things provides you with an out-of-the-box experience on several of the most popular embedded and mobile systems.

More details about Stack4Things can be found [here](https://github.com/MDSLab/stack4things).

Lighthing-rod is the node-side component in the Stack4Things architecture. In this repository, you find the version that works with the standalone version of the IoTronic service that you can find [**here**](https://github.com/MDSLab/s4t-iotronic-standalone).

Lightning-rod (in its standalone version) has been tested to work on:

* Raspberry Pi 2
* Arduino YUN
* Linino ONE
* Ubuntu 16.04 
* Ubuntu 14.04 

##Installation guides

###Arduino YUN/Linino ONE

We tested this procedure on an Arduino YUN with LininoOS and LininoIO installed. Everything needs to be run as root. For the installation to be completed successfully, you need a working Node.js environment and a working kernel with gre, tun, ipv6, tunnel4, tunnel6, and ip6_tunnel module packages (kmod-*) installed.

* [Installation guide for Arduino YUN/Linino ONE](docs/arduinoyun.md)

###Raspberry Pi 2

We tested this procedure on a Raspberry Pi 2 with Raspbian Jessie Lite installed. Everything needs to be run as root.

* [Installation guide for Raspberry Pi](docs/raspberrypi2.md)

###Standard PC 

* [Installation guide for Ubuntu 16.04](docs/ubuntu1604.md)

* [Installation guide for Ubuntu 14.04](docs/ubuntu1404.md)

If you want to install Lightning-rod within an LXD container, you can follow the first part of the IoTronic installation guide you can find [here](https://github.com/MDSLab/s4t-iotronic-standalone/blob/master/doc/installation_lxd.md).
