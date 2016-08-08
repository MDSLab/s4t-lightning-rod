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

var Q = require('q');
var fork = require('child_process').fork;

var logger = require('../../utils/log4js-wrapper').getLogger("Socat");
var Reverse = require('../reverse');
var WAMP = require('../wamp');
var Board = require('../board');
var constants = require('../../shared/constants/socat');

var socatProcessRelPath =  __dirname + '/../../process/socat';

var socatState = require('./_state');


/**
 * Socat subsystem singleton
 */
var Socat = module.exports = {};

/**
 * Returns SocatState
 *
 * @returns {SocatState}
 */
Socat.getState = function () {
    return socatState;
};


/**
 * Starts socat and opens a tunnel for it
 *
 * @param socatServerIp
 * @param socatServerPort
 * @param socatBoardIp
 * @returns {Q.Promise}
 */
Socat.initNetwork = function (socatServerIp, socatServerPort, socatBoardIp) {
    var d = Q.defer();
    logger.info("[NETWORK-MANAGER] - Network initialization...");

    var socatProcess = fork(socatProcessRelPath);

    //NEW-net
    var inputMessage = {
        basePort: socatState._socatPort,
        socatBoardIp: socatBoardIp,
        socatServerIp: socatServerIp
    };

    socatProcess.on('message', function (msg) {
        if (msg.uncaughtException) {
            logger.error("Uncaught exception in a child process: " + msg.uncaughtException);
            return;
        }

        if (msg.name !== constants.name) {  // todo ??? what's the purpose of this?
            return;
        }

        if (msg.status === constants.messageStatus.alive) {
            logger.info("[NETWORK-MANAGER] - WSTT activating...");

            Reverse.openTunnel(socatState._socatPort,
                Reverse.getState().getReverseTunnelingServer(), socatServerPort);

        } else if (msg.status === constants.messageStatus.complete) {
            logger.info('[NETWORK-MANAGER] - Sending notification to IOTRONIC: '
                + msg.status + ' - ' + msg.logmsg);

            WAMP.getState().getSession().call('iotronic.rpc.command.result_network_board',
                [msg.logmsg, Board.getState().getBoardCode()])
                .then(function (result) {
                    logger.info('[NETWORK-MANAGER] --> response from IOTRONIC: ' + result);
                    logger.info('[NETWORK-MANAGER] - TUNNELS CONFIGURATION BOARD SIDE COMPLETED!');
                });

            d.resolve();
        } else {
            logger.error("Unrecognized message status of the socat process: " + msg);
        }
    });

    socatProcess.on('error', function (err) {
        // todo maybe start another one?
        logger.error('network-wrapper error: ' + err);
    });

    socatProcess.on('exit', function (code, signal) {
        // todo maybe start another one?
        var reason = code || signal;  // handle args like (null, 'SIGTERM')
        logger.error('network-wrapper exited with code: ' + reason);
        d.reject(new Error("Child process exited with error code: " + reason));
    });

    // todo what about close(stdio pipe) and disconnect(IPC) events?

    socatProcess.send(inputMessage);

    return d.promise;
};
