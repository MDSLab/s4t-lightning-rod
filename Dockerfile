FROM node:carbon-slim

RUN  apt-get update && apt-get install -y \
 socat dsniff fuse libfuse-dev git ntpdate python pkg-config build-essential gdb \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g --unsafe gyp autobahn@18.10.2 ws@6.1.0 nconf@0.10.0 @mdslab/wstun@1.0.7 fuse-bindings@2.8.1 requestify@0.2.5 is-running@2.1.0 connection-tester@0.2.0 log4js@1.1.1 q@1.5.1 fs-access@1.0.1 mknod@1.1.0 jsonfile md5@2.2.1 python-shell@0.5.0 net@1.0.2 lsof@0.1.0\
 && npm install -g --unsafe https://github.com/PlayNetwork/node-statvfs/tarball/v3.0.0 \
 && npm cache --force clean

RUN mkdir -p /var/lib/iotronic/plugins \
 && mkdir -p /var/lib/iotronic/drivers/mountpoints/ \
 && mkdir -p /var/log/iotronic/ \
 && mkdir -p /var/log/wstun/ \
 && touch /var/log/wstun/wstun.log \
 && touch /var/log/iotronic/lightning-rod.log

WORKDIR /usr/local/lib/node_modules/

RUN git clone --depth=1 git://github.com/MDSLab/s4t-lightning-rod.git ./@mdslab/iotronic-lightning-rod

ENV NODE_PATH=/usr/local/lib/node_modules
ENV IOTRONIC_HOME=/var/lib/iotronic
ENV LIGHTNINGROD_HOME=/usr/local/lib/node_modules/@mdslab/iotronic-lightning-rod
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

RUN cp /usr/local/lib/node_modules/@mdslab/iotronic-lightning-rod/modules/plugins-manager/plugins.example.json /var/lib/iotronic/plugins/plugins.json \
 && cp /usr/local/lib/node_modules/@mdslab/iotronic-lightning-rod/modules/drivers-manager/drivers.example.json /var/lib/iotronic/drivers/drivers.json

RUN cp /usr/local/lib/node_modules/@mdslab/iotronic-lightning-rod/etc/logrotate.d/lightning-rod.log /etc/logrotate.d/lightning-rod.log

WORKDIR /usr/local/lib/node_modules/@mdslab/iotronic-lightning-rod/

VOLUME /var/lib/iotronic

CMD [ "node", "lightning-rod"]
 
