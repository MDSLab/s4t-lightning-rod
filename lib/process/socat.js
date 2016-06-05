/*
 *				 Apache License
 *                           Version 2.0, January 2004
 *                        http://www.apache.org/licenses/
 *
 *      Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Giovanni Merlino,
 *      Andrea Rocco Lotronto, Arthur Warnier, Nicola Peditto, Kostya Esmukov
 *
 */
"use strict";

/**
 * This is a wrapper process for socat.
 * It's run in a separate process (child_process.fork) in order to
 * protect the core Lightning Rod process from abuse.
 *
 * See https://github.com/MDSLab/s4t-lightning-rod/issues/32
 */

var spawn = require('child_process').spawn;

var log4jsWrapper = require('../utils/log4js-wrapper');
var nconfWrapper = require('../utils/nconf-wrapper');
var processUtils = require('./utils/utils');
var choices = require('./choices/socat');

var logger = log4jsWrapper.getLogger("network-wrapper");
var nconf = nconfWrapper.nconf;


nconfWrapper.reload();
log4jsWrapper.reload(nconf);


function handleStdioEvents(proc) {
    // todo maybe handle stdio 'error' and 'end' events?

}

function message(logmsg, status) {
    return {name: choices.name, status: status, logmsg: logmsg}
}

/**
 * Performs Socat Wrapper initialization
 *
 * @param basePort
 * @param socatBoardIp
 * @param socatServerIp
 * @constructor
 */
function SocatWrapper(basePort, socatBoardIp, socatServerIp) {
    logger.info("[NETWORK-MANAGER] - SOCAT starting...");

    //NEW-net
    //socat -d -d \ TCP-L:<basePort>,bind=localhost,reuseaddr,forever,interval=10 \ TUN:<socatBoard_ip>,tun-name=socat0,iff-up &
    var args = ['-d', '-d', 'TCP-L:' + basePort + ',bind=localhost,reuseaddr,forever,interval=10', 'TUN:' + socatBoardIp + '/31,tun-name=socat0,up'];
    var socatProcess = spawn('socat', args);
    logger.info('SOCAT COMMAND: socat ' + args.join(" "));
    logger.info("--> SOCAT PID: " + socatProcess.pid);

    handleStdioEvents(socatProcess);

    socatProcess.stdout.on('data', function (data) {
        logger.info('SOCAT - stdout: ' + data);
    });

    socatProcess.stderr.on('data', function (data) {
        var textdata = 'stderr: ' + data;
        logger.info("SOCAT - " + textdata);

        if (textdata.indexOf("starting data transfer loop") < 0)
            return;

        //NEW-net
        //ip link set $TUNNAME up
        spawn('ifconfig', ['socat0', 'up']);

        logger.info('NETWORK COMMAND: ifconfig socattun socat0 up');
        logger.info('SOCAT TUNNEL SUCCESSFULLY ESTABLISHED!');

        //NEW-net: INIZIALIZZARE IL TUNNEL GRE CONDIVISO
        //ip link add gre-lr0 type gretap remote <serverip> local <boadip>
        //ip link set gre-lr0 up
        var greIfaceProcess = spawn('ip', ['link', 'add', 'gre-lr0', 'type', 'gretap', 'remote', socatServerIp, 'local', socatBoardIp]);
        logger.info('GRE IFACE CREATION: ip link add gre-lr0 type gretap remote ' + socatServerIp + ' local ' + socatBoardIp);

        handleStdioEvents(greIfaceProcess);

        greIfaceProcess.stdout.on('data', function (data) {
            logger.info('--> GRE IFACE CREATION stdout: ' + data);
        });
        greIfaceProcess.stderr.on('data', function (data) {
            logger.info('--> GRE IFACE CREATION stderr: ' + data);
        });

        greIfaceProcess.on('close', function (code) {
            if (code != 0) {
                logger.error('--> GRE IFACE exited with error code ' + code);
                process.exit(code);
            }

            logger.info("--> GRE IFACE CREATED!");

            //ip link set gre-lr<port> up
            var greIfaceUpProcess = spawn('ip', ['link', 'set', 'gre-lr0', 'up']);
            logger.info('GRE IFACE UP: ip link set gre-lr0 up');

            handleStdioEvents(greIfaceUpProcess);

            greIfaceUpProcess.stdout.on('data', function (data) {
                logger.info('--> GRE IFACE UP stdout: ' + data);
            });
            greIfaceUpProcess.stderr.on('data', function (data) {
                logger.info('--> GRE IFACE UP stderr: ' + data);
            });
            greIfaceUpProcess.on('close', function (code) {
                if (code != 0) {
                    logger.error('--> GRE IFACE UP exited with error code ' + code);
                    process.exit(code);
                }

                logger.info("--> GRE IFACE UP!");
                //logger.info('TUNNELS CONFIGURATION BOARD SIDE COMPLETED!');

                //SEND MESSAGE TO IOTRONIC
                process.send(message("tunnels configured", choices.messageStatusChoices.complete));
            });
        });
    });

    socatProcess.on('close', function (code) { //in case of disconnection, delete all interfaces
        logger.info('SOCAT - process exited with code ' + code);
        if (code != 0) {
            process.exit(code);
        }
    });

    //NEW-net
    process.send(message("I'm alive!", choices.messageStatusChoices.alive));
}

SocatWrapper.prototype.exit = function () {
    // todo cleanup ???
};

var socatWrapper;

process.once('message', function (message) {

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

    //NEW-net
    var basePort = message.basePort;
    var socatBoardIp = message.socatBoardIp;
    var socatServerIp = message.socatServerIp;

    logger.info("[NETWORK-MANAGER] - NetWRAPPER loaded!");

    socatWrapper = new SocatWrapper(basePort, socatBoardIp, socatServerIp);
});


processUtils.setupCleanupCallback(function (code) {
    logger.info("Exiting with error code " + code);

    if (socatWrapper)
        socatWrapper.exit();
});
