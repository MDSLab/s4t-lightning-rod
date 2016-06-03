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
var Board = require('./board');


var reverseState = new ReverseState();

/**
 * Reverse subsystem state.
 * Don't ever cache it's results, because they might be changed at any time.
 *
 * @constructor
 */
function ReverseState() {
    this._reverseServerUrl = null;
    this._libBin = null;

    // Open tunnels' state is not maintained here, because once
    // the LR process will be restarted, that state will be lost.
    // The best option here is to let the OS handle that state,
    // i.e. simply look at the running processes.
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
    nconf_ = nconf_ || nconf;

    // todo include port in url_reverse
    var urlReverse = nconf_.get('config:reverse:server:url_reverse');
    if (!urlReverse) {
        throw new ConfigError("config:reverse:server:url_reverse can't be empty");
    }

    // todo get rid of this - port should be a part of url
    var portReverse = nconf_.get('config:reverse:server:port_reverse');
    if (portReverse) {
        urlReverse += ":" + portReverse;
        logger.warn("config:reverse:server:port_reverse should be a part of config:reverse:server:url_reverse");
    }

    if (urlReverse.indexOf(":") < 0) {
        throw new ConfigError("url_reverse must contain a port");
    }

    var libBin = nconf_.get('config:reverse:lib:bin');
    if (!libBin) {
        throw new ConfigError("config:reverse:lib:bin can't be empty");
    }

    this._reverseServerUrl = urlReverse;
    this._libBin = libBin;
};


ReverseState.prototype._processPidByLocalPort = function (localport) {
    return Board.getState().getDevice().getProcessesList().then(function (processes) {
        for (var i = 0; i < processes.length; i++) {
            var proc = processes[i];

            if (proc.isCommandFileEquals(this._libBin)
                && proc.argsContain([new RegExp('127\.0\.0\.1:' + localport + '$')])) {
                return proc.pid;
            }
        }

        return null;
    }.bind(this));
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

    return reverseState._processPidByLocalPort(localPort).then(function (pid) {
        if (pid !== null) {
            throw new Error("Tunnel on that port is already open!");
        }

        var args = ['-r', '' + remotePort + ':' + '127.0.0.1' + ':' + localPort, reverseTunnellingServerUrl];

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
    if (!reverseState.isLoaded())
        throw new Error("Not loaded yet");

    return reverseState._processPidByLocalPort(localPort).then(function (pid) {
        if (pid === null) {
            logger.info('Could not close tunnel on port ' + localPort + ' because there is no tunnel open on that port');
            return;
        }

        logger.info('Killing process: ' + pid);
        process.kill(pid, 'SIGINT');
    }.bind(this));
};

