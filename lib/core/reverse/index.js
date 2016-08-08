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


var spawn = require('child_process').spawn;

var logger = require('../../utils/log4js-wrapper').getLogger("Reverse");

var reverseState = require('./_state');


/**
 * Reverse subsystem singleton
 */
var Reverse = module.exports = {};

/**
 * Returns ReverseState
 *
 * @returns {ReverseState}
 */
Reverse.getState = function () {
    return reverseState;
};


/**
 * Opens a reverse tunnel
 *
 * @throws {Error} if tunnel on that localPort is already open
 * @throws {Error} if state is not loaded yet
 * @param localPort
 * @param reverseTunnellingServerUrl
 * @param remotePort
 */
Reverse.openTunnel = function (localPort, reverseTunnellingServerUrl, remotePort) {
    if (!reverseState.isLoaded()) {
        throw new Error("Not loaded yet");
    }

    return reverseState._processPidByLocalPort(localPort).then(function (pid) {
        if (pid !== null) {
            throw new Error("Tunnel on that port is already open!");
        }

        var args = ['-r', '' + remotePort + ':' + '127.0.0.1' + ':' + localPort,
            reverseTunnellingServerUrl];

        logger.info('Executing command: ' + reverseState._libBin + ' ' + args.join(" "));

        var wsstProcess = spawn(reverseState._libBin, args);

        wsstProcess.stdout.on('data', function (data) {
            logger.info('stdout of process ' + wsstProcess.pid + ': ' + data);
        });
        wsstProcess.stderr.on('data', function (data) {
            logger.info('stderr of process ' + wsstProcess.pid + ': ' + data);
        });
        wsstProcess.on('close', function (code) {
            logger.info('child process ' + wsstProcess.pid + ' exited with code ' + code);
        });

    }.bind(this));
};

/**
 * Closes previously opened tunnel
 *
 * @throws {Error} if state is not loaded yet
 * @param localPort
 */
Reverse.closeTunnel = function (localPort) {
    if (!reverseState.isLoaded()) {
        throw new Error("Not loaded yet");
    }

    return reverseState._processPidByLocalPort(localPort).then(function (pid) {
        if (pid === null) {
            logger.info('Could not close tunnel on port ' + localPort
                + ' because there is no tunnel open on that port');
            return;
        }

        logger.info('Killing process: ' + pid);
        process.kill(pid, 'SIGINT');
    }.bind(this));
};

