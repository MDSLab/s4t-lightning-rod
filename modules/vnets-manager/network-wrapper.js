//############################################################################################
//##
//# Copyright (C) 2014-2018 Dario Bruneo, Francesco Longo, Giovanni Merlino,
//# Nicola Peditto, Fabio Verboso
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//############################################################################################

nconf = require('nconf');
SETTINGS = process.env.IOTRONIC_HOME + '/settings.json';
nconf.file ({file: SETTINGS});

log4js = require('log4js');
log4js.loadAppender('file');
logfile = nconf.get('config:log:logfile');
loglevel = nconf.get('config:log:loglevel');
log4js.addAppender(log4js.appenders.file(logfile));


var socat_pid = null;

//service logging configuration: "network-wrapper"
var logger = log4js.getLogger('network-wrapper');
logger.setLevel(loglevel);


// We need to redefine the logging configuration because it is another spwaned process.
try {

    loglevel = nconf.get('config:log:loglevel');
    if (loglevel === undefined) {
        logger.setLevel('INFO');
    } else {
        logger.setLevel(loglevel);
    }
}
catch (err) {
    logger.setLevel('INFO');
}


process.once('message', function (message) {

    var spawn = require('child_process').spawn;

    //MESSAGE RECEIVED FROM IOTRONIC:
    /*
     var input_message = {
         "args": args,
         "socatBoard_ip": socatBoard_ip,
         "basePort": basePort,
         "bSocatNum": bSocatNum,
         "socatClient": socatClient
     }

     var socatServer_ip = args[0];
     var socatServer_port = args[1];
     var socatBoard_ip = args[2];
     var net_backend = args[3];


     */

    var basePort = message.basePort;
    var socatBoard_ip = message.socatBoard_ip;
    var socatServer_ip = message.socatServer_ip;
    net_backend = message.net_backend;

    //var socatServer_port = message.socatServer_port; //TO RESTORE
    //var boardCode = message.boardCode; //TO RESTORE

    logger.debug("[VNET] - NetWRAPPER loaded!");
    logger.info("[VNET] - SOCAT starting...");

    //var socatProcess = spawn('socat', ['-d','-d','TCP-L:'+ basePort +',bind=localhost,reuseaddr,forever,interval=10','TUN:'+socatBoard_ip+'/31,tun-name=socat0,tun-type=tap,up'])
    //logger.info('SOCAT COMMAND: socat -d -d TCP-L:'+ basePort +',bind=localhost,reuseaddr,forever,interval=10 TUN:'+socatBoard_ip+'/31,tun-name=socat0,tun-type=tap,up' );
    var socatProcess = spawn('socat', ['-d', '-d', 'TCP-L:' + basePort + ',bind=localhost,nodelay,reuseaddr,forever,interval=10', 'TUN:' + socatBoard_ip + '/31,tun-name=socat0,tun-type=tap,up'])
    //socat -d -d TCP-L:20000,bind=localhost,nodelay,reuseaddr,forever,interval=10 TUN:10.0.0.5/30,tun-name=socat0,tun-type=tap,iff-up &	  

    logger.debug("[VNET] --> SOCAT PID: " + socatProcess.pid);

    if (socatProcess.pid != undefined)
        logger.debug("[VNET] --> SOCAT daemon succefully started!");
    
    socat_pid = socatProcess.pid;


    socatProcess.stdout.on('data', function (data) {
        logger.debug('[VNET] --> SOCAT - stdout: ' + data);
    });

    socatProcess.stderr.on('data', function (data) {

        var textdata = 'stderr: ' + data;
        logger.debug("[VNET] --> SOCAT - " + textdata);

        if (textdata.indexOf("starting data transfer loop") > -1) {

            logger.debug('[VNET] --> WSTUN configuration completed!');

            //ip link set $TUNNAME up
            spawn('ifconfig', ['socat0', 'up']);

            logger.debug('[VNET] --> NETWORK COMMAND: ifconfig socattun socat0 up');
            logger.info('[VNET] --> SOCAT TUNNEL SUCCESSFULLY ESTABLISHED!');

            if (net_backend == 'iotronic') {

                // Shared GRE tunnel initialization
                //ip link add gre-lr0 type gretap remote <serverip> local <boadip>
                var greIface = spawn('ip', ['link', 'add', 'gre-lr0', 'type', 'gretap', 'remote', socatServer_ip, 'local', socatBoard_ip]);
                logger.debug('[VNET] --> GRE IFACE CREATION: ip link add gre-lr0 type gretap remote ' + socatServer_ip + ' local ' + socatBoard_ip);

                greIface.stdout.on('data', function (data) {
                    logger.debug('[VNET] ----> GRE IFACE CREATION stdout: ' + data);
                });
                greIface.stderr.on('data', function (data) {
                    logger.debug('[VNET] ----> GRE IFACE CREATION stderr: ' + data);
                });
                greIface.on('close', function (code) {

                    logger.debug("[VNET] --> GRE IFACE CREATED!");

                    //ip link set gre-lr0 up
                    var greIface_up = spawn('ip', ['link', 'set', 'gre-lr0', 'up']);
                    logger.debug('[VNET] --> GRE IFACE UP COMMAND: ip link set gre-lr0 up');

                    greIface_up.stdout.on('data', function (data) {
                        logger.debug('[VNET] ----> GRE IFACE UP stdout: ' + data);
                    });
                    greIface_up.stderr.on('data', function (data) {
                        logger.debug('[VNET] ----> GRE IFACE UP stderr: ' + data);
                    });
                    greIface_up.on('close', function (code) {

                        logger.debug("[VNET] --> GRE IFACE UP!");
                        logger.info('[VNET] --> GRE tunnel info: server ip = ' + socatServer_ip + ' - local ip = ' + socatBoard_ip);

                        //SEND MESSAGE TO IOTRONIC
                        process.send({name: "socat", status: "complete", logmsg: "tunnels configured", pid: socat_pid});

                    });
                           
                });
            } else {
                //SEND MESSAGE TO IOTRONIC
                process.send({name: "socat", status: "complete", logmsg: "tunnels configured", pid: socat_pid});
            }
        }

    });

    socatProcess.on('close', function (code) {
        //in case of disconnection, delete all interfaces
        logger.info('[VNET] --> SOCAT - process exited with code ' + code);

        //logger.warn(boardCode+" needs to be restored!");
        //networksManager.setSocatOnBoard([socatServer_ip, socatServer_port, socatBoard_ip, net_backend, boardCode, true] );  //TO RESTORE

    });

    process.send({name: "socat", status: "alive", logmsg: "I'm alive!"});


});


process.on('exit', function () {
    process.send({name: "socat", level: "warn", logmsg: 'SOCAT Process terminated!'});
});


