/*
 *				                 Apache License
 *                           Version 2.0, January 2004
 *                        http://www.apache.org/licenses/
 *
 *      Copyright (c) 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino, Fabio Verboso, Nicola Peditto
 * 
 */

nconf = require('nconf');
nconf.file({file: 'settings.json'});

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
     */

    var basePort = message.basePort;
    var socatBoard_ip = message.socatBoard_ip;
    var socatServer_ip = message.socatServer_ip;
    net_backend = message.net_backend;

    logger.info("[NETWORK] - NetWRAPPER loaded!");
    logger.info("[NETWORK] - SOCAT starting...");

    //var socatProcess = spawn('socat', ['-d','-d','TCP-L:'+ basePort +',bind=localhost,reuseaddr,forever,interval=10','TUN:'+socatBoard_ip+'/31,tun-name=socat0,tun-type=tap,up'])
    //logger.info('SOCAT COMMAND: socat -d -d TCP-L:'+ basePort +',bind=localhost,reuseaddr,forever,interval=10 TUN:'+socatBoard_ip+'/31,tun-name=socat0,tun-type=tap,up' );
    var socatProcess = spawn('socat', ['-d', '-d', 'TCP-L:' + basePort + ',bind=localhost,nodelay,reuseaddr,forever,interval=10', 'TUN:' + socatBoard_ip + '/31,tun-name=socat0,tun-type=tap,up'])
    //socat -d -d TCP-L:20000,bind=localhost,nodelay,reuseaddr,forever,interval=10 TUN:10.0.0.5/30,tun-name=socat0,tun-type=tap,iff-up &	  

    logger.debug("[NETWORK] --> SOCAT PID: " + socatProcess.pid);

    if (socatProcess.pid != undefined)
        logger.debug("[NETWORK] --> SOCAT daemon succefully started!");
    
    socat_pid = socatProcess.pid;


    socatProcess.stdout.on('data', function (data) {
        logger.debug('[NETWORK] --> SOCAT - stdout: ' + data);
    });

    socatProcess.stderr.on('data', function (data) {

        var textdata = 'stderr: ' + data;
        logger.debug("[NETWORK] --> SOCAT - " + textdata);

        if (textdata.indexOf("starting data transfer loop") > -1) {

            logger.debug('[NETWORK] --> WSTT configuration completed!');

            //ip link set $TUNNAME up
            spawn('ifconfig', ['socat0', 'up']);

            logger.debug('[NETWORK] --> NETWORK COMMAND: ifconfig socattun socat0 up');
            logger.info('[NETWORK] --> SOCAT TUNNEL SUCCESSFULLY ESTABLISHED!');

            if (net_backend == 'iotronic') {

                // Shared GRE tunnel initialization
                //ip link add gre-lr0 type gretap remote <serverip> local <boadip>
                var greIface = spawn('ip', ['link', 'add', 'gre-lr0', 'type', 'gretap', 'remote', socatServer_ip, 'local', socatBoard_ip]);
                logger.debug('[NETWORK] --> GRE IFACE CREATION: ip link add gre-lr0 type gretap remote ' + socatServer_ip + ' local ' + socatBoard_ip);

                greIface.stdout.on('data', function (data) {
                    logger.debug('[NETWORK] ----> GRE IFACE CREATION stdout: ' + data);
                });
                greIface.stderr.on('data', function (data) {
                    logger.debug('[NETWORK] ----> GRE IFACE CREATION stderr: ' + data);
                });
                greIface.on('close', function (code) {

                    logger.debug("[NETWORK] --> GRE IFACE CREATED!");

                    //ip link set gre-lr0 up
                    var greIface_up = spawn('ip', ['link', 'set', 'gre-lr0', 'up']);
                    logger.debug('[NETWORK] --> GRE IFACE UP COMMAND: ip link set gre-lr0 up');

                    greIface_up.stdout.on('data', function (data) {
                        logger.debug('[NETWORK] ----> GRE IFACE UP stdout: ' + data);
                    });
                    greIface_up.stderr.on('data', function (data) {
                        logger.debug('[NETWORK] ----> GRE IFACE UP stderr: ' + data);
                    });
                    greIface_up.on('close', function (code) {

                        logger.debug("[NETWORK] --> GRE IFACE UP!");
                        logger.info('[NETWORK] --> GRE tunnel info: server ip = ' + socatServer_ip + ' - local ip = ' + socatBoard_ip);

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
        logger.info('[NETWORK] --> SOCAT - process exited with code ' + code);

    });

    process.send({name: "socat", status: "alive", logmsg: "I'm alive!"});


});


process.on('exit', function () {
    process.send({name: "socat", level: "warn", logmsg: 'SOCAT Process terminated!'});
});


