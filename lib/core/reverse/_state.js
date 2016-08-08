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

var ConfigError = require('../../utils/config-error');
var logger = require('../../utils/log4js-wrapper').getLogger("Reverse");
var Board = require('../board');


var reverseState = module.exports = new ReverseState();  // eslint-disable-line no-unused-vars

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
        logger.warn("config:reverse:server:port_reverse should be a part of ' " +
            "+ 'config:reverse:server:url_reverse");
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
    if (!this.isLoaded()) {
        throw new Error("Not loaded yet");
    }

    return this._reverseServerUrl;
};

