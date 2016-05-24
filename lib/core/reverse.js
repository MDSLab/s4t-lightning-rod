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


var nconf = require('nconf');
var spawn = require('child_process').spawn;

var ConfigError = require('./../utils/config-error');
var logger = require('./../utils/log4js-wrapper').getLogger("Reverse");
var helpers = require('./../utils/helpers');


var reverseState = new ReverseState();

/**
 * Reverse subsystem state
 *
 * @constructor
 */
function ReverseState() {
    this._reverseServerUrl = null;
    this._libBin = null;

    this._openedTunnels = {};
}

/**
 * Returns false if ReverseState is not loaded yet
 *
 * @returns {boolean}
 */
ReverseState.prototype.isLoaded = function () {
    return this._reverseServerUrl !== null;
};

/**
 * Reloads Reverse subsystem state
 *
 * @throws {ConfigError}
 * @param nconf_ might be omitted
 */
ReverseState.prototype.reload = function (nconf_) {
    var nconf = nconf_ || nconf;

    // todo include port in url_reverse
    var url_reverse = nconf.get('config:reverse:server:url_reverse');
    if (!url_reverse) {
        throw new ConfigError("config:reverse:server:url_reverse can't be empty");
    }

    // todo get rid of this - port should be a part of url
    var port_reverse = nconf.get('config:reverse:server:port_reverse');
    if (port_reverse) {
        url_reverse += ":" + port_reverse;
        logger.warn("port_reverse should be a part of url_reverse");
    }

    if (url_reverse.indexOf(":") < 0) {
        throw new ConfigError("url_reverse must contain a port");
    }

    var wstt_lib = nconf.get('config:reverse:lib:bin');
    if (!wstt_lib) {
        throw new ConfigError("config:reverse:lib:bin can't be empty");
    }

    this._reverseServerUrl = url_reverse;
    this._libBin = wstt_lib;
};


/**
 * Returns configured remote reverse tunneling server URL
 *
 * @throws {Error} if state is not loaded yet
 * @returns {string}
 */
ReverseState.prototype.getReverseTunnelingServer = function () {
    if (!this.isLoaded())
        throw new Error("Not loaded yet");

    return this._reverseServerUrl;
};


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
    if (!reverseState.isLoaded())
        throw new Error("Not loaded yet");

    if (reverseState._openedTunnels[localPort])
        throw new Error("Tunnel on that port is already open!");

    var args = ['-r ' + remotePort + ':' + '127.0.0.1' + ':' + localPort, reverseTunnellingServerUrl];

    logger.info('Executing command: ' + reverseState._libBin + ' ' + args.join(" "));

    var process = spawn(reverseState._libBin, args);

    reverseState._openedTunnels[localPort] = {
        process: process
    };

    process.stdout.on('data', function (data) {
        logger.info('stdout of process ' + process.pid + ': ' + data);
    });
    process.stderr.on('data', function (data) {
        logger.info('stderr of process ' + process.pid + ': ' + data);
    });
    process.on('close', function (code) {
        logger.info('child process ' + process.pid + ' exited with code ' + code);

        delete reverseState._openedTunnels[localPort];
    });
};

/**
 * Closes previously opened tunnel
 *
 * @throws {Error} if state is not loaded yet
 * @param localPort
 */
Reverse.closeTunnel = function (localPort) {
    if (!reverseState.isLoaded())
        throw new Error("Not loaded yet");

    if (!reverseState._openedTunnels[localPort]) {
        logger.info('Could not close tunnel on port ' + localPort + ' because there is no tunnel open on that port');
        return;
    }

    var process = reverseState._openedTunnels[localPort].process;

    logger.info('Killing process: ' + process.pid);
    process.kill('SIGINT');
};

