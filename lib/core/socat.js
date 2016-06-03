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
var nconf = require('nconf');
var fork = require('child_process').fork;

var ConfigError = require('./../utils/config-error');
var logger = require('./../utils/log4js-wrapper').getLogger("Socat");
var Reverse = require('./reverse');
var WAMP = require('./wamp');
var Board = require('./board');
var shared = require('./process/shared/socat');


var socatState = new SocatState();

/**
 * Socat subsystem state
 * Don't ever cache it's results, because they might be changed at any time.
 *
 * @constructor
 */
function SocatState() {
    this._socatPort = null;
}


/**
 * Returns false if SocatState is not loaded yet
 *
 * @returns {boolean}
 */
SocatState.prototype.isLoaded = function () {
    return this._socatPort !== null;
};


/**
 * Reloads Socat subsystem state
 *
 * @throws {ConfigError}
 * @param nconf_ might be omitted
 */
SocatState.prototype.reload = function (nconf_) {
    nconf_ = nconf_ || nconf;

    var socatPort = nconf_.get('config:socat:client:port');
    if (!socatPort) {
        throw new ConfigError("config:socat:client:port can't be empty");
    }

    this._socatPort = socatPort;
};

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

    var socatProcess = fork('./process/socat');

    //NEW-net
    var inputMessage = {
        "basePort": socatState._socatPort,
        "socatBoardIp": socatBoardIp,
        "socatServerIp": socatServerIp
    };

    socatProcess.on('message', function (msg) {
        if (msg.name !== shared.name)
            return;

        if (msg.status === shared.messageStatusChoices.alive) {
            logger.info("[NETWORK-MANAGER] - WSTT activating...");

            Reverse.openTunnel(socatState._socatPort,
                Reverse.getState().getReverseTunnelingServer(), socatServerPort);

        } else if (msg.status === shared.messageStatusChoices.complete) {
            logger.info('[NETWORK-MANAGER] - Sending notification to IOTRONIC: ' + msg.status + ' - ' + msg.logmsg);

            WAMP.getState().getSession().call('iotronic.rpc.command.result_network_board', [msg.logmsg, Board.getState().getBoardCode()])
                .then(function (result) {
                    logger.info('[NETWORK-MANAGER] --> response from IOTRONIC: ' + result);
                    logger.info('[NETWORK-MANAGER] - TUNNELS CONFIGURATION BOARD SIDE COMPLETED!');
                });

            d.resolve();
        } else {
            logger.error("Unrecognized message status of the socat process: " + msg.status);
        }
    });

    socatProcess.on('error', function (err) {
        // todo maybe start another one?
        logger.error('network-wrapper error: ' + err);
    });

    socatProcess.on('exit', function (code, signal) {
        // todo maybe start another one?
        logger.error('network-wrapper exited with code: ' + code);
        d.reject(new Error("Child process exited with error code: " + code))
    });

    // todo what about close(stdio pipe) and disconnect(IPC) events?

    socatProcess.send(inputMessage);

    return d.promise;
};
